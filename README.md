# MaintainabilityAI Framework

[![CI](https://img.shields.io/github/actions/workflow/status/AliceNN-ucdenver/MaintainabilityAI/pages.yml?label=Build%20%26%20Pages)](https://github.com/AliceNN-ucdenver/MaintainabilityAI/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![CodeQL](https://img.shields.io/badge/security-CodeQL-blue)](https://github.com/AliceNN-ucdenver/MaintainabilityAI/actions/workflows/codeql.yml)
[![OWASP Top 10](https://img.shields.io/badge/OWASP-Top%2010%20(2021)-orange)](https://owasp.org/Top10/)

> **An open-source framework for security-first AI-assisted software development**
> Production-ready prompt packs, threat modeling workflows, evolutionary architecture patterns, and a VS Code extension for enterprise governance — designed for collaborative improvement and community-driven prompt exchange.

**Live Documentation**: [maintainability.ai](https://maintainability.ai) &nbsp;|&nbsp; **VS Code Extension**: [Marketplace](https://marketplace.visualstudio.com/items?itemName=MaintainabilityAI.maintainabilityai)

---

## Why Open Source This Framework?

**The Challenge**: AI code generation is fast, but without security constraints and architectural guidance, teams ship vulnerable code faster than ever. Traditional security training doesn't translate well to AI-assisted workflows.

**Our Solution**: A complete framework integrating:
- **OWASP Top 10 prompt packs** — Security-first templates for AI code generation
- **STRIDE threat modeling** — Design-phase security with AI assistance
- **Evolutionary architecture patterns** — Maintainability guardrails (fitness functions, dependency hygiene, strangler fig)
- **VS Code extension** — Enterprise governance dashboard, security scorecard, and AI agent orchestration built on [CALM](https://github.com/finos/architecture-as-code)
- **6-phase SDLC integration** — From threat model to production deployment

**Why Open Source?**
1. **Collective Intelligence** — Security prompts improve through community testing and refinement
2. **Prompt Exchange** — Share what works, iterate on what doesn't
3. **Transparency** — Security-first AI development should be accessible to everyone
4. **Standards** — Establish common patterns for AI-assisted secure development

> **We believe the best security prompts come from practitioners.** Contribute your improvements, share your variations, and help establish industry patterns for responsible AI development.

---

## Quick Start

**View the complete framework**: Visit [maintainability.ai](https://maintainability.ai) for comprehensive documentation, interactive examples, and workshop materials.

**Use prompts locally** (recommended for Claude Code & GitHub Copilot):

```bash
# Clone repository
git clone https://github.com/AliceNN-ucdenver/MaintainabilityAI.git
cd MaintainabilityAI

# Browse available prompts
ls site-tw/public/docs/prompts/owasp/        # OWASP Top 10 (A01-A10)
ls site-tw/public/docs/prompts/threat-modeling/  # STRIDE categories
ls site-tw/public/docs/prompts/maintainability/  # Architecture patterns

# Reference in Claude Code or Copilot
# Example: "Use #file:site-tw/public/docs/prompts/owasp/A03_injection.md to refactor this function"
```

**Run the site locally**:

```bash
npm install
cd site-tw
npm install
npm run dev  # Opens at http://localhost:5173
```

---

## What's Included

### VS Code Extension

The **MaintainabilityAI VS Code Extension** brings the full framework into your editor with two panels:

- **Looking Glass** — Enterprise governance dashboard with portfolio scoring across four pillars (Architecture, Security, Information Risk, Operations), interactive CALM architecture diagrams, NIST SP 800-53 policy management, and the Absolem AI governance advisor
- **Cheshire Cat** — Code-level companion with SDLC scaffolding, security scorecard (6 fitness functions), structured RCTRO issue creation, and agent orchestration for Claude Code and Copilot Coding Agent

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MaintainabilityAI.maintainabilityai) or see the [extension README](vscode-extension/README.md) for details.

### OWASP Top 10 Prompt Packs
Production-ready security prompts for AI code generation covering all OWASP 2021 categories:

- **A01**: Broken Access Control → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A01_broken_access_control)
- **A02**: Cryptographic Failures → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A02_crypto_failures)
- **A03**: Injection → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A03_injection)
- **A04**: Insecure Design → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A04_insecure_design)
- **A05**: Security Misconfiguration → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A05_security_misconfig)
- **A06**: Vulnerable Components → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A06_vuln_outdated)
- **A07**: Authentication Failures → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A07_authn_failures)
- **A08**: Integrity Failures → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A08_integrity_failures)
- **A09**: Logging/Monitoring → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A09_logging_monitoring)
- **A10**: Server-Side Request Forgery → [View Prompt](https://maintainability.ai/docs/prompts/owasp/A10_ssrf)

**[Browse All OWASP Prompts](https://maintainability.ai/docs/prompts/owasp/)**

### STRIDE Threat Modeling
AI-powered threat detection before code is written (93% of threats found in design phase):

- Spoofing Identity → [View Prompt](https://maintainability.ai/docs/prompts/threat-modeling/spoofing)
- Tampering with Data → [View Prompt](https://maintainability.ai/docs/prompts/threat-modeling/tampering)
- Repudiation → [View Prompt](https://maintainability.ai/docs/prompts/threat-modeling/repudiation)
- Information Disclosure → [View Prompt](https://maintainability.ai/docs/prompts/threat-modeling/information-disclosure)
- Denial of Service → [View Prompt](https://maintainability.ai/docs/prompts/threat-modeling/denial-of-service)
- Elevation of Privilege → [View Prompt](https://maintainability.ai/docs/prompts/threat-modeling/elevation-of-privilege)

**[Browse STRIDE Prompts](https://maintainability.ai/docs/prompts/threat-modeling/)**

### Maintainability Patterns
Evolutionary architecture prompts for long-lived systems:

- **Fitness Functions** → Automated quality gates (complexity ≤10, coverage ≥80%)
- **Dependency Hygiene** → The 90-day rule for dependency freshness
- **Strangler Fig Pattern** → Incremental legacy modernization
- **Technical Debt Tracking** → Structured debt management

**[Browse Maintainability Prompts](https://maintainability.ai/docs/prompts/maintainability/)**

### Working Examples
The `examples/` directory contains deliberately insecure TypeScript code with corresponding tests:

```
examples/owasp/
  A01_broken_access_control/
    insecure.ts          # Vulnerable implementation
    __tests__/bac.test.ts  # Attack scenarios
  A02_crypto_failures/
    insecure.ts
    __tests__/crypto.test.ts
  A03_injection/
    insecure.ts          # SQL injection vulnerability
    __tests__/injection.test.ts
  ...
```

**Purpose**: Use these as hands-on remediation exercises. Apply prompt packs to refactor insecure code into secure implementations.

**Try it**:
```bash
# Run tests to see vulnerabilities
npm test -- A03_injection

# Use prompts to fix code
# Reference: site-tw/public/docs/prompts/owasp/A03_injection.md

# Verify fix
npm test -- A03_injection
npm run lint
```

---

## The Golden Rules of AI-Assisted Development

> **Source**: Synthesized from Addy Osmani's research and documented in Mani, A. (2025). *Beyond Vibe Coding: From Coder to AI-Era Developer*. O'Reilly Media.

These governance principles ensure AI assistance enhances rather than compromises code quality:

1. **Be Specific and Clear About What You Want**  
   The quality of AI's output reflects the quality of your prompt. Use the RCTRO pattern: Role → Context → Task → Requirements → Output.

2. **Always Validate AI Output Against Your Intent**  
   Test, review, and measure against requirements. Never merge code without understanding it.

3. **Treat AI as a Junior Developer (With Supervision)**  
   They're fast but lack context and judgment. Your experience guides their suggestions.

4. **Don't Merge Code You Don't Understand**  
   You own every line, regardless of origin. If AI generates something complex, study it before committing.

5. **Isolate AI Changes in Git**  
   Commit AI-generated code separately with clear labels (`🤖 AI-assisted with Claude Code`).

6. **Ensure All Code Undergoes Human Review**  
   Same quality standards as human-written code. Apply security checklists during PR review.

7. **Prioritize Documentation and Rationale**  
   Document the "why" behind decisions, not just the "what". AI can generate code, but you provide context.

8. **Share and Reuse Effective Prompts**  
   Build a team library of proven patterns. Contribute improvements back to the community.

**[Read Full Governance Guide](https://maintainability.ai/docs/governance/vibe-golden-rules)** — Detailed examples, PR checklists, and team adoption strategies.

---

## Contributing & Prompt Exchange

**We encourage community contributions!** The best security prompts come from real-world usage and iterative refinement.

### Ways to Contribute

1. **Improve Existing Prompts**  
   Found a better way to phrase a security constraint? Submit a PR with your refinement.

2. **Share Prompt Variations**  
   Tool-specific variations (Claude Code vs Copilot Coding Agent vs ChatGPT) or language-specific adaptations (Python, Go, Rust).

3. **Add New Patterns**  
   Discovered a new security pattern or architectural fitness function? Share it with the community.

4. **Report Issues**  
   Found a prompt that generates insecure code? Open an issue with details and reproduction steps.

5. **Translation & Localization**  
   Help make security-first AI development accessible globally.

### Contribution Guidelines

```bash
# 1. Fork the repository
# 2. Create a feature branch
git checkout -b feature/improve-a03-prompt

# 3. Make your changes to prompts in site-tw/public/docs/prompts/
# 4. Test locally
cd site-tw
npm run dev

# 5. Commit with clear description
git commit -m "improve(A03): Add input sanitization examples for Python

- Add regex validation patterns
- Include Django ORM examples
- Clarify parameterization benefits

AI-assisted with Claude Code"

# 6. Push and open PR
git push origin feature/improve-a03-prompt
```

**Please include**:
- Which AI tool you tested with (Claude Code, Copilot Coding Agent, ChatGPT, etc.)
- Programming language/framework context
- Before/after examples if applicable
- Testing results

**[Read Contributing Guide](.github/CONTRIBUTING.md)** for detailed instructions.

---

## Repository Structure

```
MaintainabilityAI/
├── vscode-extension/          # VS Code extension (Looking Glass + Cheshire Cat)
│   ├── src/
│   │   ├── services/              # MeshService, GovernanceScorer, GitSync
│   │   ├── webview/app/           # Panel UI (Looking Glass, Scaffold, Oraculum)
│   │   └── types/                 # Shared TypeScript types
│   ├── prompt-packs/              # 23 embedded prompt packs
│   └── package.json               # Extension manifest
│
├── site-tw/                   # Tailwind documentation site (Vite)
│   ├── public/
│   │   └── docs/              # All documentation (Markdown)
│   │       ├── prompts/       # Prompt pack library
│   │       │   ├── owasp/         # OWASP Top 10 (A01-A10)
│   │       │   ├── threat-modeling/  # STRIDE categories
│   │       │   └── maintainability/  # Architecture patterns
│   │       ├── workshop/          # 4-part workshop
│   │       ├── sdlc/              # SDLC framework
│   │       ├── agents/            # AI agent guides
│   │       └── governance/        # Golden Rules
│   ├── src/                   # Site source (Tailwind + vanilla JS)
│   └── index.html             # Site entry point
│
├── examples/                  # Hands-on remediation exercises
│   └── owasp/
│       ├── A01_broken_access_control/
│       │   ├── insecure.ts        # Vulnerable code
│       │   └── __tests__/         # Attack scenarios
│       ├── A02_crypto_failures/
│       ├── A03_injection/
│       └── ...                    # A04-A10
│
├── .github/
│   ├── workflows/             # CI/CD (Pages, CodeQL, Snyk)
│   └── PULL_REQUEST_TEMPLATE.md
│
├── jest.config.ts             # Test configuration
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies & scripts
```

**Key Locations**:
- **Extension**: `vscode-extension/` — Governance dashboard, scorecard, agent orchestration
- **Prompts**: `site-tw/public/docs/prompts/` — All prompt packs (OWASP, STRIDE, Maintainability)
- **Examples**: `examples/owasp/` — Vulnerable code for hands-on learning
- **Documentation**: `site-tw/public/docs/` — Complete framework docs (served at maintainability.ai)

---

## Example: Remediate SQL Injection (A03)

This walkthrough demonstrates the complete secure development workflow.

### **Step 1: Examine Vulnerable Code**

Open [`examples/owasp/A03_injection/insecure.ts`](examples/owasp/A03_injection/insecure.ts):

```typescript
// ❌ INSECURE: String concatenation enables SQL injection
export async function searchUsers(query: string) {
  const client = new Client({});
  await client.connect();
  const sql = `SELECT id, email FROM users WHERE email LIKE '%${query}%'`;
  const res = await client.query(sql);
  await client.end();
  return res.rows;
}
```

**Attack**: `query = "' OR '1'='1"` returns all users.

### **Step 2: Apply OWASP A03 Prompt**

Reference the prompt: [`site-tw/public/docs/prompts/owasp/A03_injection.md`](site-tw/public/docs/prompts/owasp/A03_injection.md)

**In Claude Code or Copilot**:
```
Use #file:site-tw/public/docs/prompts/owasp/A03_injection.md to refactor 
examples/owasp/A03_injection/insecure.ts with parameterized queries and 
input validation.
```

### **Step 3: Review AI-Generated Secure Code**

```typescript
// ✅ SECURE: Parameterized query + validation
import { Client } from 'pg';
import { z } from 'zod';

const searchQuerySchema = z.string()
  .trim()
  .max(100)
  .regex(/^[a-zA-Z0-9 _.\-@]*$/);

export async function searchUsers(query: string) {
  const validated = searchQuerySchema.parse(query);
  const client = new Client({});
  await client.connect();

  try {
    const sql = 'SELECT id, email FROM users WHERE email ILIKE $1';
    const res = await client.query(sql, [`%${validated}%`]);
    return res.rows;
  } catch (err) {
    console.error('Database error');
    throw new Error('Search failed');
  } finally {
    await client.end();
  }
}
```

**Improvements**: ✅ Parameterization ✅ Input validation ✅ Length limits ✅ Generic errors

### **Step 4: Verify**

```bash
npm test -- A03_injection  # Tests pass, attacks blocked
npm run lint               # ESLint clean
```

### **Step 5: Commit with AI Label**

```bash
git commit -m "fix(A03): Remediate SQL injection with parameterized queries

- Add Zod input validation with character allowlist
- Use pg $1 placeholders (no string concatenation)
- Enforce 100-char limit
- Generic error messages

🤖 AI-assisted with Claude Code using OWASP A03 prompt"
```

**[View Complete Example](https://maintainability.ai/docs/workshop/part3-live-remediation)**

---

## Deployment

The site deploys automatically via GitHub Actions:

1. Push to `main` branch
2. GitHub Actions builds the site
3. Deploys to GitHub Pages

**Custom domain**: Add `CNAME` file in `site-tw/public/` and configure DNS.

---

## Additional Resources

- **[Complete Documentation](https://maintainability.ai/docs)** — Full framework guide
- **[VS Code Extension](vscode-extension/README.md)** — Governance dashboard, scorecard, agent orchestration
- **[Workshop](https://maintainability.ai/docs/workshop/)** — Team training materials
- **[SDLC Integration](https://maintainability.ai/docs/sdlc/)** — 6-phase development framework
- **[AI Agent Guides](https://maintainability.ai/docs/agents/)** — Claude Code, Copilot Coding Agent, ChatGPT comparison
- **[Security Policy](.github/SECURITY.md)** — Responsible disclosure

---

## License

MIT License — see [LICENSE](LICENSE) for details.

**We encourage**:
- Using prompts in commercial projects
- Modifying prompts for your context
- Sharing improvements back to the community
- Building derivative works

---

## Acknowledgments

Built with contributions from security practitioners, AI researchers, and the open-source community.

**Frameworks & Standards**:
- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [Microsoft STRIDE Threat Modeling](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
- [Evolutionary Architecture (ThoughtWorks)](https://www.thoughtworks.com/insights/books/building-evolutionary-architectures)

**AI Tools**:
- Claude Code (Anthropic)
- GitHub Copilot Coding Agent (GitHub / Microsoft)
- ChatGPT (OpenAI)

**Inspired by**:
- Addy Osmani's research on AI-assisted development
- Mani, A. (2025). *Beyond Vibe Coding: From Coder to AI-Era Developer*. O'Reilly Media

---

## Community & Support

- **Issues**: [GitHub Issues](https://github.com/AliceNN-ucdenver/MaintainabilityAI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AliceNN-ucdenver/MaintainabilityAI/discussions)
- **Email**: hello@maintainability.ai