# Workshop Guide

This 8-part workshop pairs OWASP + Maintainability prompt packs with vulnerable TypeScript examples. Learn the complete security-first + maintainable AI-assisted development workflow.

## Overview

- **Duration**: 8 × 90 minutes
- **Audience**: Junior → Senior developers
- **Format**: 70% hands-on lab, 30% lecture
- **Prerequisites**: Basic TypeScript, Git, VS Code

## Workshop Parts

### [Part 1: The Spectrum (Vibe → AI-Assisted → Agentic)](./workshop/part1-spectrum)
Understand the three modes of AI-assisted development and when to use each. Learn why AI-Assisted Engineering is the sweet spot for production work.

**What You'll Learn**:
- Vibe Coding: When speed matters more than rigor
- AI-Assisted Engineering: Production-ready development with human oversight
- Agentic Coding: Autonomous task execution for well-defined problems
- The 70% problem: Why AI excels at initial code but struggles with the final 30%

**Hands-On**: Compare the same feature built three ways (vibe, assisted, agentic) and measure velocity vs. quality.

---

### [Part 2: Security-First Prompting with OWASP](./workshop/part2-security-prompting)
Master the anatomy of security-first prompts. Learn to embed OWASP requirements directly into AI instructions for secure-by-default code generation.

**What You'll Learn**:
- Prompt Anatomy: Role + Context + Security Requirements + Task + Checklist
- The OWASP Top 10 (2021) mapped to prompt patterns
- Using `site-tw/public/docs/prompts/owasp/` directory in VS Code
- Tool-specific variations: Claude Code, GitHub Copilot (`#codebase`), ChatGPT

**Hands-On**: Build a file upload feature using A03 Injection + A05 Misconfiguration prompt packs. Compare "vague prompt" vs. "security-first prompt" outputs.

**Resources**: [`site-tw/public/docs/prompts/owasp/A03_injection.md`](./prompts/owasp/A03_injection), [`site-tw/public/docs/prompts/owasp/A05_security_misconfig.md`](./prompts/owasp/A05_security_misconfig)

---

### [Part 3: Live Remediation - Fix A03 Injection](./workshop/part3-live-remediation)
Step-by-step SQL injection remediation using real vulnerable code. Learn the complete workflow: identify → prompt → refactor → test → verify → commit.

**What You'll Learn**:
- Vulnerability analysis: Read insecure code, identify attack vectors
- Prompt selection: Choose the right OWASP pack (A03: Injection)
- AI-assisted refactor: Use Copilot/Claude with security constraints
- Validation: Parameterized queries, Zod schemas, generic errors
- Testing: Jest tests with SQL injection payloads (e.g., `' OR '1'='1`)
- Commit hygiene: AI disclosure labels (`🤖 AI-assisted`)

**Hands-On**: Fix `examples/owasp/A03_injection/insecure.ts` using the A03 prompt pack. Make all tests pass in `__tests__/injection.test.ts`.

**Deliverable**: Pull request with before/after diff, AI disclosure, and clean security scans.

---

### Part 4: Fitness Functions - Automated Quality Gates
Implement Evolutionary Architecture fitness functions to prevent technical debt. Automate complexity checks, dependency freshness, coverage enforcement, and performance regression detection.

**What You'll Learn**:
- Fitness function types: Complexity, dependency freshness, coverage, performance
- Complexity enforcement: Use ts-morph to calculate cyclomatic complexity ≤10
- Dependency hygiene: 3-month freshness rule with npm outdated checks
- Coverage gates: Prevent coverage regressions, enforce ≥80% threshold
- Performance baselines: Track p95 latency, fail on >10% regressions

**Hands-On**: Create 4 fitness functions:
1. Complexity test: Fail if any function >10
2. Dependency test: Fail if any dependency >90 days old
3. Coverage test: Fail if coverage drops below 80%
4. Performance test: Baseline API latency, fail on regression

**Resources**: [`site-tw/public/docs/prompts/maintainability/fitness-functions.md`](./prompts/maintainability/fitness-functions)

**Deliverable**: CI workflow runs fitness tests, blocks PR if violations detected.

---

### Part 5: CodeQL + Snyk - Full Security Pipeline
Master both CodeQL (SAST) and Snyk (SCA + SAST) for comprehensive security scanning. Learn to interpret findings, write custom queries, and integrate autofix guidance with AI tools.

**What You'll Learn**:
- CodeQL setup: GitHub Actions security-extended queries, SARIF output analysis
- Custom CodeQL queries: Detect AI-specific anti-patterns (hardcoded secrets, eval usage)
- Snyk Test: Dependency vulnerability scanning with severity thresholds
- Snyk Code: SAST for TypeScript, detects OWASP A01-A10
- AI-assisted triage: Use ChatGPT to analyze SARIF/Snyk output, prioritize fixes

**Hands-On**:
1. Run CodeQL on all OWASP examples, write custom query to detect hardcoded API keys
2. Run `npx snyk test` and `npx snyk code test`, configure `.snyk` policy
3. Use ChatGPT to analyze CodeQL SARIF output and suggest fixes
4. Create PR, verify both scanners block merge on high/critical findings

**Integration**: Both tools run in CI, complement each other (CodeQL catches logic flaws, Snyk catches CVEs).

---

### Part 6: Building Your Team Prompt Library
Create hybrid prompts combining security + maintainability requirements for production-grade outcomes.

**What You'll Learn**:
- Prompt structure: Template format combining security + maintainability requirements
- Hybrid prompts: Merge OWASP A03 (Injection) + Fitness Functions (complexity ≤10)
- Version control: Track prompt iterations, success rates, failure modes
- Customization: Adapt to your stack (Go, Python, Java) + Strangler Fig migrations
- Metrics: Measure effectiveness (acceptance rate, time to green tests, fitness function pass rate)

**Hands-On**: Create a team prompt for "API endpoint with auth + validation + logging + maintainability."
- Combine: OWASP A01 (Access Control) + A07 (AuthN) + A09 (Logging) + Fitness Functions (complexity ≤10)
- Add dependency constraint: Use bcrypt ≥5.1.0 (dependency hygiene)
- Test with 3 developers, measure: security scan pass rate, complexity, time to completion
- Iterate based on feedback, version in `site-tw/public/docs/prompts/team/secure-maintainable-api.md`

**Deliverable**: Hybrid prompt template (security + maintainability) with metrics.

---

### Part 7: Multi-Agent Security Orchestration
Coordinate multiple AI agents for complex security workflows. Learn the Threat Modeler → Implementer → Validator pattern and when to use consensus validation.

**What You'll Learn**:
- Agent selection: ChatGPT for design, Copilot for implementation, Claude for validation
- Sequential pattern: Threat model → Secure implementation → Security review
- Parallel pattern: Multiple agents implement same spec, diff outputs
- Consensus pattern: 3 agents validate security, require 2/3 agreement
- Handoff protocols: Structured JSON for agent-to-agent communication

**Hands-On**: Build a password reset flow using multi-agent orchestration:
1. ChatGPT threat models (identifies A04, A07, A09)
2. Copilot implements using prompt packs
3. Claude + ChatGPT validate independently (consensus on security)

**Pattern**: See [`/AGENTS.md`](../AGENTS.md) for orchestration templates.

---

### Part 8: Governance & Golden Rules
Implement the Golden Rules framework for responsible AI-assisted development. Learn pre-deploy checklists, metrics dashboards, and how to ship with confidence.

**What You'll Learn**:
- The 6 Golden Rules: Be specific, trust but verify, treat AI as junior dev, isolate changes, document rationale, share prompts
- PR template: AI disclosure, security checklist, OWASP validation
- Review process: Human validates Golden Rules compliance
- Metrics dashboard: Track AI acceptance rate, security findings, velocity
- Incident response: When AI-generated code causes a security issue
- Continuous improvement: Quarterly prompt library review, fitness function refinement

**Hands-On**: Conduct a mock PR review of AI-generated code. Use the PR template, validate Golden Rules, run ChatGPT on OWASP compliance checklist. Approve or request changes with specific security feedback.

**Capstone**: Each team presents their prompt library, metrics, and governance model.

---

## What You'll Take Home

### Artifacts
- Complete OWASP A01-A10 prompt pack (customized for your stack)
- Maintainability prompt packs (fitness functions, dependency hygiene, Strangler Fig, technical debt)
- Team prompt library starter kit (security + maintainability hybrid prompts)
- PR template with AI disclosure and security checklist
- CodeQL + Snyk CI/CD workflows (copy-paste ready)
- Fitness function test suite (complexity, coverage, performance, dependency freshness)
- Multi-agent orchestration templates
- Metrics dashboard (Grafana/DataDog config)

### Skills
- Security-first prompt engineering (OWASP integration)
- Maintainability-first prompting (fitness functions, complexity limits)
- OWASP Top 10 remediation with AI
- Fitness function implementation (ts-morph, autocannon, nyc)
- Dependency hygiene enforcement (3-month rule, Renovate bot)
- Multi-agent security workflows
- CodeQL custom query writing + Snyk policy configuration
- Golden Rules governance + technical debt tracking

---

## Prerequisites

### Technical
- Intermediate TypeScript/JavaScript
- Git basics (clone, commit, PR)
- VS Code familiarity
- Basic terminal/CLI usage

### Tools Setup
- GitHub account (CodeQL access)
- Claude Code, Copilot, or ChatGPT
- Node 18+ installed
- Optional: Snyk account (free tier)

### Knowledge
- Basic security awareness (SQL injection, XSS)
- AI tool experience helpful but not required
- Willingness to learn OWASP concepts

---

## Ready to Transform Your Team?

Available for on-site or remote delivery. Customizable to your tech stack and team size.

**Contact**: [hello@maintainability.ai](mailto:hello@maintainability.ai?subject=Workshop%20Inquiry)
