# Compact Prompt Packs

This directory contains condensed versions of the comprehensive prompt packs from `/site-tw/public/docs/prompts/` optimized for AI agent contexts.

## Structure

```
promptpack/
├── TEMPLATE.md                    # Template used to create all compact guides
├── README.md                      # This file
├── owasp/                         # OWASP Top 10 (2021) compact guides
│   ├── A01_broken_access_control.md
│   ├── A02_crypto_failures.md
│   ├── A03_injection.md
│   ├── A04_insecure_design.md
│   ├── A05_security_misconfig.md
│   ├── A06_vuln_outdated.md
│   ├── A07_authn_failures.md
│   ├── A08_integrity_failures.md
│   ├── A09_logging_monitoring.md
│   └── A10_ssrf.md
├── maintainability/               # Maintainability pattern compact guides
│   ├── complexity-reduction.md
│   ├── dependency-hygiene.md
│   ├── dry-principle.md
│   ├── fitness-functions.md
│   ├── single-responsibility.md
│   ├── strangler-fig.md
│   └── technical-debt.md
└── threat-modeling/               # STRIDE threat model compact guides
    ├── denial-of-service.md
    ├── elevation-of-privilege.md
    ├── information-disclosure.md
    ├── repudiation.md
    ├── spoofing.md
    └── tampering.md
```

## Purpose

### Full Prompt Packs (15-35KB each)
Located in `/site-tw/public/docs/prompts/`

**Designed for**:
- Human learning and education
- Comprehensive understanding
- Multiple workflow scenarios
- Copy-paste prompt templates

**Contains**:
- Detailed explanations
- Multiple AI prompts with full context
- Extensive examples
- 30+ item checklists
- Additional resources and links

### Compact Prompt Packs (3-5KB each)
Located in `/examples/promptpack/` (this directory)

**Designed for**:
- AI agent context (limited tokens)
- Quick remediation reference
- Embedded in GitHub issues
- Automated workflows

**Contains**:
- Essential definition
- STRIDE/OWASP mapping
- Key types/patterns list
- Concise vulnerable example
- Focused secure example
- 4-6 item actionable checklist
- One-sentence key takeaway

## Size Comparison

| Category | Files | Full Size | Compact Size | Reduction |
|----------|-------|-----------|--------------|-----------|
| OWASP | 10 | 250KB | ~40KB | 84% |
| Maintainability | 7 | 110KB | ~30KB | 73% |
| Threat-Modeling | 6 | 130KB | ~25KB | 81% |
| **Total** | **23** | **490KB** | **~95KB** | **~80%** |

## Usage

### In Claude Code Remediation Agent

The `/examples/agents` automation fetches these compact guides when creating security issues:

```javascript
// Fetch compact OWASP guide for injection
const prompt = await fetchPrompt('owasp', 'A03_injection.md');

// Embed in GitHub issue for Claude remediation
const issueBody = `
${vulnerabilityDetails}

## Security Guidance
${prompt}

## @claude Remediation Zone
...
`;
```

### Direct Reference

Developers can reference these guides for quick remediation:

```bash
# View compact guide for SQL injection
cat examples/promptpack/owasp/A03_injection.md

# View maintainability guide for complexity
cat examples/promptpack/maintainability/complexity-reduction.md

# View STRIDE tampering guide
cat examples/promptpack/threat-modeling/tampering.md
```

## Template

All guides follow the template defined in [TEMPLATE.md](TEMPLATE.md):

1. **What is [Topic]?** - 1-2 sentence definition
2. **STRIDE/OWASP Mapping** - Threat model connections
3. **Types/Patterns** - Key variants (bullet list)
4. **What It Looks Like** - Vulnerable TypeScript example
5. **What Good Looks Like** - Secure TypeScript example with patterns
6. **Human Review Checklist** - 4-6 actionable categories
7. **Key Takeaway** - One critical principle

## Maintenance

### Updating Guides

When updating a compact guide:

1. Check if the full prompt pack changed in `/site-tw/public/docs/prompts/`
2. Follow [TEMPLATE.md](TEMPLATE.md) for structure
3. Maintain 3-5KB target size
4. Test with Claude Code agent
5. Update this README if structure changes

### Adding New Guides

To add a new compact guide:

1. Create full guide in `/site-tw/public/docs/prompts/[category]/`
2. Apply [TEMPLATE.md](TEMPLATE.md) to create compact version
3. Save to appropriate category directory
4. Test file size (should be 3-5KB)
5. Update automation mapping if needed

## Quality Standards

Each compact guide must:
- ✅ Be 3-5KB (strict limit for agent context)
- ✅ Include TypeScript code examples
- ✅ Have actionable checklist (4-6 items)
- ✅ Follow template structure exactly
- ✅ Be self-contained (no external deps)
- ✅ Focus on remediation (not education)

## Integration

These compact guides are integrated into:

1. **GitHub Actions Workflow** - `/examples/agents/.github/workflows/codeql-to-issues.yml`
   - Fetches compact guides based on CodeQL rule mapping
   - Embeds in security issues automatically

2. **Process Script** - `/examples/agents/automation/process-codeql-results.js`
   - Maps CodeQL rules to compact guides
   - Handles fetching and embedding logic

3. **Claude Remediation** - `/examples/agents/.github/workflows/claude-remediation.yml`
   - Claude reads embedded compact guide
   - Generates remediation plan based on guidance

## Benefits

**For AI Agents**:
- 80% smaller (fits in limited context)
- Faster to parse and understand
- Focused on actionable patterns
- No extraneous tutorial content

**For Developers**:
- Quick reference during triage
- Clear examples (bad vs good)
- Concise checklist for review
- Easy to scan and understand

**For Automation**:
- Efficient token usage
- Consistent structure for parsing
- Predictable format for agents
- Version-controlled and testable

## Version

**Current Version**: 1.0
**Template Version**: 1.0
**Last Updated**: 2025-10-15
**Total Guides**: 23

## Related Documentation

- [Full Prompt Packs](../../site-tw/public/docs/prompts/) - Comprehensive tutorials
- [Agent Example](../agents/) - CodeQL + Claude AI automation
- [OWASP Top 10](https://owasp.org/Top10/) - Official OWASP documentation
- [STRIDE](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats) - Microsoft threat modeling

---

**Maintained by**: MaintainabilityAI Project
**License**: MIT
**Questions**: See main [README.md](../../README.md)
