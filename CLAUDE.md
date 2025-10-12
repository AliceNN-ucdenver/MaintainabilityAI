# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MaintainabilityAI** is a complete **end-to-end SDLC framework** for security-first AI-assisted engineering. It combines:
- A Tailwind marketing site (`/site-tw`) deployed to GitHub Pages at [maintainability.ai](https://maintainability.ai)
- **Complete SDLC framework** (`/docs/sdlc/`, `/docs/maintainability/`, `/docs/framework.md`) with 6 phases
- **Agent-specific guidance** (`/COPILOT.md`, `/CHATGPT.md`, `/AGENTS.md`) for multi-agent orchestration
- OWASP Top 10 (2021) vulnerable TypeScript examples (`/examples/owasp/A01-A10`) with full test coverage
- Comprehensive security prompt packs (`/prompts/owasp/`) integrated into every SDLC phase
- **Evolutionary architecture** with fitness functions and maintainability patterns
- Automated security scanning (CodeQL, Snyk) + fitness function validation in CI/CD
- 8-part workshop curriculum for teams learning security-first AI development

## Development Commands

### Building and Running
```bash
# Install dependencies (root and site)
npm install

# Run Tailwind site dev server (Vite)
npm run dev

# Build everything (site + docs) for deployment
npm run build

# Build site only
npm run build:site

# Build docs only (Markdown → HTML in site-tw/dist/docs)
npm run docs
```

### Testing and Linting
```bash
# Run all Jest tests in /examples
npm test

# Run specific OWASP category tests
npm test -- A03_injection

# Run ESLint on TypeScript files (max warnings: 0)
npm run lint

# Security scanning (local)
npx snyk test                 # Dependency vulnerabilities
npx snyk code test            # SAST code analysis
```

## Project Architecture

### Dual-Site Structure
This repo deploys **two** sites as one GitHub Pages artifact:

1. **Main site** (`/site-tw`) — Tailwind marketing pages built with Vite
   - Source: `site-tw/src/`, `site-tw/index.html`, `site-tw/agenda.html`
   - Output: `site-tw/dist/` (published at `/`)
   - Custom domain: CNAME file in `site-tw/public/CNAME`

2. **Docs site** (`/docs`) — Markdown files converted to static HTML
   - Source: `docs/*.md`, `docs/owasp/*.md`, `docs/workshop/*.md`, `docs/governance/*.md`
   - Script: `scripts/build-docs.mjs` (MarkdownIt + Shiki syntax highlighting)
   - Output: `site-tw/dist/docs/` (published at `/docs`)
   - Template: Uses Tailwind styles from main site (`/styles.css`)

### OWASP Workshop Structure

**All 10 categories are fully implemented** with:
- **Insecure example**: `examples/owasp/A0X_*/insecure.ts` — vulnerable code to fix
- **Comprehensive tests**: `examples/owasp/A0X_*/__tests__/*.test.ts` — Jest tests for security validation
- **Full prompt packs**: `prompts/owasp/A0X_*.md` — Complete AI prompts with Role/Context/Task/Checklist
- **Documentation**: `docs/owasp/A0X.md` — explanatory docs

**Workflow**:
1. Use prompt pack from `/prompts/owasp/` with Claude Code/Copilot
2. Refactor `insecure.ts` to fix vulnerability
3. Run tests to verify security controls
4. Lint and scan with ESLint, CodeQL, Snyk
5. Commit with AI label: `🤖 AI-assisted with [tool] using OWASP A0X prompt pack`

### Workshop Curriculum (`/docs/workshop/`)

**8-part workshop** for teams (3 parts completed, rest planned):
- **Part 1**: The Spectrum (Vibe → AI-Assisted → Agentic)
- **Part 2**: Security-First Prompting (Context + Constraints + Validation + Tests)
- **Part 3**: Live Remediation Exercise (A03 Injection fix walkthrough)
- **Part 4-8**: Planned (CodeQL, Snyk, Prompt Library, Multi-Agent, Governance)

### Governance Documentation (`/docs/governance/`)

- **[`vibe-golden-rules.md`](docs/governance/vibe-golden-rules.md)**: Comprehensive guide to the 6 Golden Rules with examples, patterns, and metrics
- **[`framework.md`](site-tw/public/docs/framework.md)**: Complete SDLC framework with integrated 6-layer security pipeline

### TypeScript & Testing Configuration

- **tsconfig.json**: Targets ES2020, CommonJS modules, strict mode
  - Includes: `examples/**/*.ts`, `scripts/**/*.mjs`
  - Types: `jest`, `node`

- **jest.config.ts**: Uses `ts-jest` preset
  - Test root: `examples/`
  - Coverage enabled (outputs to `coverage/`)
  - All 10 OWASP categories have test files

- **ESLint**: TypeScript-ESLint parser/plugin
  - Ignores: `site-tw/dist`, `**/node_modules`
  - Rule: `@typescript-eslint/no-explicit-any` is `warn` (not error)

### CI/CD Pipeline

**Pages Deployment** (`.github/workflows/pages.yml`):
On push to `main`:
1. Install dependencies (`npm ci || npm install`)
2. Build site + docs (`npm run build`)
3. Upload `site-tw/dist` as Pages artifact
4. Deploy to GitHub Pages (maintainability.ai)

**Security Scanning**:
- **CodeQL** (`.github/workflows/codeql.yml`): Security-extended queries, runs on PR and push
- **Snyk** (`.github/workflows/snyk.yml`): Dependency + SAST scanning, non-blocking, uploads artifacts

## Complete SDLC Framework

This repository implements a **complete 6-phase SDLC framework** that integrates security, AI agents, and maintainability:

### Framework Overview
See [`docs/framework.md`](docs/framework.md) for the master integration document. The framework includes:

1. **Design Phase** ([`docs/sdlc/phase1-design.md`](docs/sdlc/phase1-design.md))
   - Threat modeling with ChatGPT
   - OWASP category mapping
   - Fitness function definitions
   - Security requirements from `/prompts/owasp/`

2. **Implementation Phase** ([`docs/sdlc/phase2-implementation.md`](docs/sdlc/phase2-implementation.md))
   - Agent selection (Claude/Copilot/ChatGPT)
   - Using OWASP prompt packs
   - Incremental development with validation
   - Local testing (ESLint + Jest)

3. **Verification Phase** ([`docs/sdlc/phase3-verification.md`](docs/sdlc/phase3-verification.md))
   - CodeQL security scanning
   - Snyk dependency/SAST scanning
   - Fitness function validation
   - Attack vector testing

4. **Governance Phase** ([`docs/sdlc/phase4-governance.md`](docs/sdlc/phase4-governance.md))
   - PR review with Golden Rules
   - OWASP compliance validation
   - Human-in-the-loop security checks
   - Approval criteria

5. **Deployment Phase** ([`docs/sdlc/phase5-deployment.md`](docs/sdlc/phase5-deployment.md))
   - CI/CD with security re-scanning
   - Smoke tests and health checks
   - Monitoring and alerting

6. **Evolution Phase** ([`docs/sdlc/phase6-evolution.md`](docs/sdlc/phase6-evolution.md))
   - Metrics collection and analysis
   - Prompt library iteration
   - Dependency upgrades (3-month rule)
   - Technical debt management

### Maintainability & Evolutionary Architecture
See [`docs/maintainability/`](docs/maintainability/) for:
- **Fitness Functions** ([`fitness-functions.md`](docs/maintainability/fitness-functions.md)): 5 automated quality gates
  - Complexity (cyclomatic ≤10)
  - Dependency Freshness (≤3 months old)
  - Security Compliance (0 high/critical)
  - Test Coverage (≥80%)
  - Performance (p95 <200ms)
- **Evolutionary Architecture** ([`evolutionary-architecture.md`](docs/maintainability/evolutionary-architecture.md)):
  - Incremental change patterns (Strangler Fig, Feature Flags)
  - Refactoring with AI assistance
  - "Upgrade All The Things" kata

### Multi-Agent Orchestration
See [`/AGENTS.md`](AGENTS.md) for coordinating multiple AI agents:
- Threat Modeler → Implementer → Validator pattern
- Agent selection guide
- Handoff protocols
- Parallel and consensus validation

**When to use each agent**:
- **ChatGPT**: Threat modeling, OWASP validation, metrics analysis
- **Copilot**: In-editor implementation, pattern following
- **Claude Code** (me!): Complex refactoring, comprehensive testing, technical debt analysis

## Security Workflow ("Golden Rules of Vibe Coding")

When working with this codebase, follow the security-first approach documented in [`docs/governance/vibe-golden-rules.md`](docs/governance/vibe-golden-rules.md):

1. **Be specific** — Clearly define intent and security constraints in prompts
2. **Trust but verify** — Never merge AI-generated code without understanding it
3. **Treat AI like a junior dev** — Review, guide, and validate suggestions
4. **Isolate AI changes** — Use separate commits/PRs; label AI-assisted changes with `🤖`
5. **Document rationale** — Explain the "why" in code comments and commit messages
6. **Share winning prompts** — Capture effective prompts in `/prompts` for reuse

**Full pipeline**: See [`docs/framework.md`](site-tw/public/docs/framework.md) Security Pipeline section for detailed 6-layer defense strategy.

## Working with OWASP Examples

### Example: Fixing A03 Injection (Full Walkthrough)

See detailed walkthrough in [README.md](README.md#-example-remediate-injection-a03-with-claude-code) or [`docs/workshop/part3-live-remediation.md`](docs/workshop/part3-live-remediation.md).

**Quick version**:
1. Read vulnerable code: [`examples/owasp/A03_injection/insecure.ts`](examples/owasp/A03_injection/insecure.ts)
2. Use prompt pack: [`prompts/owasp/A03_injection.md`](prompts/owasp/A03_injection.md)
3. Refactor with:
   - Parameterized queries (pg with `$1` placeholders)
   - Zod validation (length limits, character allowlists)
   - Safe error handling (generic messages, no schema leaks)
4. Run tests: `npm test -- A03_injection`
5. Lint: `npm run lint`
6. Commit with AI label: `🤖 AI-assisted with Claude Code using OWASP A03 prompt pack`

### Key Security Patterns (Across All OWASP Categories)

**A01 - Broken Access Control**:
- Deny-by-default authorization
- RBAC/ABAC with centralized middleware
- IDOR prevention (validate resource ownership)

**A02 - Cryptographic Failures**:
- AES-256-GCM for encryption
- bcrypt (cost 12) for password hashing
- Env vars for secrets (never hardcode)

**A03 - Injection**:
- Parameterized queries ($1, $2 placeholders)
- Zod schema validation with allowlist regex
- Generic error messages

**A04 - Insecure Design**:
- Cryptographically secure random tokens
- Rate limiting and account lockout
- Token expiration and single-use

**A05 - Security Misconfiguration**:
- Restrictive CORS (no `*` origin)
- Security headers (CSP, HSTS, X-Frame-Options)
- Environment-specific configs

**A06 - Vulnerable Components**:
- Dependency pinning with lockfiles
- SRI for CDN assets
- Never use eval() with remote content

**A07 - Authentication Failures**:
- bcrypt with constant-time comparison
- Rate limiting on auth endpoints
- Secure session management with httpOnly cookies

**A08 - Integrity Failures**:
- HMAC-SHA256 signatures for artifacts
- Checksum verification
- CSP to prevent unauthorized scripts

**A09 - Logging/Monitoring Failures**:
- Structured JSON logging
- PII/secret masking
- Security event logging with alerting

**A10 - SSRF**:
- URL allowlisting (domain + protocol)
- Block private IP ranges (RFC1918, loopback)
- Block cloud metadata endpoints

## Important Files

### Build and Configuration
- **[`scripts/build-docs.mjs`](scripts/build-docs.mjs)**: Converts Markdown to HTML
  - Uses MarkdownIt + Shiki (github-dark theme)
  - Wraps in Tailwind prose template
  - Recursively walks `/docs` → `site-tw/dist/docs`

- **[`site-tw/vite.config.js`](site-tw/vite.config.js)**: Vite build configuration
  - Copies `public/` dir (includes CNAME) to `dist/`
  - Root: `.`, outDir: `dist`, emptyOutDir: `true`

### CI/CD Workflows
- **[`.github/workflows/pages.yml`](.github/workflows/pages.yml)**: Build & deploy to GitHub Pages
- **[`.github/workflows/codeql.yml`](.github/workflows/codeql.yml)**: Security-extended CodeQL analysis
- **[`.github/workflows/snyk.yml`](.github/workflows/snyk.yml)**: Snyk dependency + SAST scanning

### Documentation
- **[`README.md`](README.md)**: Complete project overview with:
  - OWASP Top 10 table mapping
  - 3 Mermaid diagrams (SDLC + Security Pipeline + Workshop Flow)
  - A03 injection walkthrough with before/after code
  - Golden Rules summary
  - Quick start and deployment guides

- **[`docs/governance/vibe-golden-rules.md`](docs/governance/vibe-golden-rules.md)**: Comprehensive governance guide (17KB)
- **[`docs/framework.md`](site-tw/public/docs/framework.md)**: Complete framework with integrated security pipeline
- **[`docs/workshop/`](docs/workshop/)**: Workshop curriculum modules

### Templates
- **[`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)**: PR checklist with AI disclosure section
- **[`.github/SECURITY.md`](.github/SECURITY.md)**: Security policy for responsible disclosure

## Notes for AI-Assisted Development

### When Working on This Repo

1. **Intentionally Vulnerable Code**: The `/examples` directory contains educational vulnerable code
   - Don't "fix" insecure.ts files unless specifically asked
   - These are teaching examples for workshops

2. **Use Prompt Packs as Specs**:
   - All security requirements are in `/prompts/owasp/*.md`
   - Follow Role → Context → Requirements → Task → Checklist pattern
   - Tests validate that security controls work

3. **Test Coverage**: All 10 OWASP categories have test files
   - Tests initially demonstrate vulnerabilities
   - After remediation, tests should validate security fixes

4. **Commit Labeling**: Always use `🤖 AI-assisted` in commits
   ```bash
   git commit -m "fix(A03): Add SQL injection prevention

   - Parameterized queries with $1 placeholders
   - Zod validation with allowlist

   🤖 AI-assisted with Claude Code using OWASP A03 prompt pack"
   ```

5. **Documentation First**:
   - Check prompt packs before implementing
   - Reference framework.md Security Pipeline section for pipeline understanding
   - Use vibe-golden-rules.md for governance guidance

### Repository Maturity

**Fully Implemented** ✅:
- All 10 OWASP insecure examples
- All 10 OWASP test files
- All 10 comprehensive prompt packs
- README with diagrams and walkthrough
- Golden Rules governance documentation
- Security workflow documentation
- Workshop parts 1-3
- CI/CD with CodeQL + Snyk
- Custom domain setup (CNAME)

**Planned** 🚧:
- Workshop parts 4-8 (CodeQL, Snyk, Prompt Library, Multi-Agent, Governance)
- Additional test scenarios for complex attack vectors
- Video walkthroughs of live remediation exercises

## Quick Reference: File Locations

```
MaintainabilityAI/
├─ README.md                              # Start here - complete overview
├─ CLAUDE.md                              # This file (for Claude Code)
├─ COPILOT.md                             # GitHub Copilot agent guide
├─ CHATGPT.md                             # ChatGPT agent guide
├─ AGENTS.md                              # Multi-agent orchestration patterns
├─ examples/owasp/A01-A10/
│  ├─ insecure.ts                         # Vulnerable code
│  └─ __tests__/*.test.ts                 # Security tests
├─ prompts/owasp/A01-A10.md               # AI prompt packs (used in all phases)
├─ docs/
│  ├─ framework.md                        # Master framework integration doc
│  ├─ sdlc/                               # 6-phase SDLC framework
│  │  ├─ index.md                         # SDLC overview
│  │  ├─ phase1-design.md                 # Design & threat modeling
│  │  ├─ phase2-implementation.md         # AI-assisted implementation
│  │  ├─ phase3-verification.md           # Testing & scanning
│  │  ├─ phase4-governance.md             # PR review & Golden Rules
│  │  ├─ phase5-deployment.md             # CI/CD & monitoring
│  │  └─ phase6-evolution.md              # Metrics & iteration
│  ├─ maintainability/                    # Evolutionary architecture
│  │  ├─ index.md                         # Maintainability overview
│  │  ├─ fitness-functions.md             # Automated quality gates
│  │  └─ evolutionary-architecture.md     # Incremental change patterns
│  ├─ governance/vibe-golden-rules.md     # 6 Golden Rules guide
│  └─ workshop/part1-3.md                 # Workshop curriculum
├─ site-tw/                               # Tailwind marketing site
├─ scripts/build-docs.mjs                 # Markdown → HTML compiler
└─ .github/workflows/                     # CI/CD (Pages, CodeQL, Snyk)
```

---

**For questions**: See [docs](https://maintainability.ai/docs) or open an issue.
