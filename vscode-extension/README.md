# MaintainabilityAI VS Code Extension

> *"Would you tell me, please, which way I ought to go from here?"*
> *"That depends a good deal on where you want to get to," said the Cat.*
> *"I don't much care where —" said Alice.*
> *"Then it doesn't matter which way you go," said the Cat.*
> *"— so long as I get somewhere," Alice added as an explanation.*
> *"Oh, you're sure to do that," said the Cat, "if you only walk long enough."*

Unlike Alice, **you know exactly where you want to go** — and the Cheshire Cat is here to guide you there. This extension brings security-first, structured feature development into VS Code. Describe what you want to build. The Cat grins, the LLM thinks, and out comes a complete RCTRO specification with OWASP security controls, STRIDE threat analysis, and maintainability patterns — all wrapped in a GitHub issue ready for Alice (or Copilot) to implement.

Look for the **Cheshire Cat grin** in your editor title bar. Click it. Start building.

---

## Features

### 1. Create RCTRO Feature Issues

*"We're all mad here." — But your issues don't have to be.*

Click the **Cheshire Cat icon** in the editor title bar, or open the command palette and run **MaintainabilityAI: Create RCTRO Feature Issue**:

- **Describe your feature** in plain text — tell the Cat what you want
- **Auto-detect tech stack** from your project (language, framework, database, testing, etc.)
- **Select prompt pack categories**: OWASP Top 10, Maintainability, STRIDE threat models
- **LLM generates a complete RCTRO prompt** (Role, Context, Task, Requirements, Output) with security controls and validation checklists
- **Preview, edit, and refine** the generated prompt — the Cat suggests, you decide
- **Submit to GitHub** as a structured issue with collapsible prompt pack guidance

Created issues include:
- RCTRO-formatted specification
- Collapsible OWASP/Maintainability/STRIDE prompt packs
- Implementation Zone with instructions for both Claude (`@claude`) and Copilot (assignment)
- Auto-created labels (`rctro-feature`, `owasp/a03`, etc.)

### 2. Scaffold SDLC Structure

*"Begin at the beginning," the King said, very gravely, "and go on till you come to the end: then stop."*

Run **MaintainabilityAI: Scaffold SDLC Structure** to set up security-first CI/CD and governance files in your project:

- `CLAUDE.md` — Agent instructions with detected tech stack
- `.github/workflows/alice-remediation.yml` — 2-phase Claude remediation workflow
- `.github/workflows/codeql.yml` — CodeQL security scanning
- `.github/workflows/fitness-functions.yml` — Automated quality gates
- `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist with AI disclosure
- `.github/SECURITY.md` — Vulnerability reporting policy
- `prompts/owasp/` — OWASP prompt packs for AI agents

### 3. Browse Prompt Packs

*"Curiouser and curiouser!"*

Run **MaintainabilityAI: Browse Prompt Packs** to explore 23 bundled prompt packs across three categories. Each pack is a compact security guide that gets embedded in your issues — so Alice and Copilot always have the right context.

### 4. Configure Repository Secrets

*"I could tell you my adventures — beginning from this morning," said Alice; "but it's no use going back to yesterday, because I was a different person then."*

Run **MaintainabilityAI: Configure Repository Secrets** to set API keys as GitHub Actions secrets:

- **Prompts for API keys** with input validation (password-masked)
- **Sets secrets via `gh` CLI** — handles encryption automatically
- **Supports Anthropic and OpenAI keys** (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
- **Optionally saves to VS Code settings** for local LLM use too
- **Re-uses existing keys** if already configured

This enables the alice-remediation workflow — so when you comment `@claude` on an issue, Alice has the keys to Wonderland.

**Prerequisite**: [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`).

---

## How It Works

```
You describe a feature
    → The Cheshire Cat detects your tech stack
    → You pick your security categories (OWASP, Maintainability, STRIDE)
    → The LLM generates a structured RCTRO prompt
    → You review and refine in the webview preview
    → Submit → GitHub issue with labels + collapsible prompt packs
    → Comment @claude or assign to Copilot → Implementation begins
```

*The Cat vanishes, but the grin remains — as a well-structured issue on your repo.*

---

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `maintainabilityai.llm.provider` | LLM provider: `vscode-lm`, `claude`, or `openai` | `vscode-lm` |
| `maintainabilityai.llm.claudeApiKey` | Anthropic API key (for Claude provider) | — |
| `maintainabilityai.llm.openaiApiKey` | OpenAI API key (for OpenAI provider) | — |
| `maintainabilityai.llm.model` | Model override (e.g., `claude-sonnet-4-5-20250929`) | — |
| `maintainabilityai.github.defaultLabels` | Default labels for created issues | `["maintainabilityai", "rctro-feature"]` |

### LLM Providers

- **VS Code LM (default)**: Uses GitHub Copilot's language model. No API key needed — just have Copilot installed and signed in.
- **Claude**: Direct Anthropic API. Set `maintainabilityai.llm.claudeApiKey` in settings.
- **OpenAI**: Direct OpenAI API. Set `maintainabilityai.llm.openaiApiKey` in settings.

---

## The Prompt Pack Library

*23 packs. 3 categories. Every one a compact guide for building things properly.*

### OWASP Top 10 (10 packs)
A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A04 Insecure Design, A05 Security Misconfiguration, A06 Vulnerable Components, A07 Authentication Failures, A08 Integrity Failures, A09 Logging/Monitoring, A10 SSRF

### Maintainability (7 packs)
Complexity Reduction, Dependency Hygiene, DRY Principle, Fitness Functions, Single Responsibility, Strangler Fig, Technical Debt

### Threat Modeling — STRIDE (6 packs)
Denial of Service, Elevation of Privilege, Information Disclosure, Repudiation, Spoofing, Tampering

---

## Issue Templates

*Don't start from scratch. Start from a template.*

Pre-built templates with curated prompt pack selections:

| Template | OWASP | Maintainability | STRIDE |
|----------|-------|-----------------|--------|
| New API Endpoint | A03, A07 | Complexity Reduction | Tampering |
| Authentication Feature | A07, A02 | DRY Principle | Spoofing |
| Data Processing Pipeline | A03, A04 | Fitness Functions, Complexity | Tampering |
| Frontend Component | A03, A05 | Single Responsibility | Info Disclosure |

---

## The Cast

| Character | Role in MaintainabilityAI |
|-----------|--------------------------|
| **The Cheshire Cat** | This extension — the guide. Appears when you need direction, generates structured prompts, and vanishes leaving only a grin (and a well-formed issue). |
| **Alice** | The remediation agent. She follows the RCTRO prompt, navigates the issue's security guidance, and implements the feature — via `@claude` or Copilot. |
| **You** | The one who knows where to go. You describe the feature, choose the security categories, review the plan, and approve the implementation. |

---

## Prerequisites

The extension checks for required tools on activation and warns if anything is missing:

| Tool | Required For | Install |
|------|-------------|---------|
| **Git** | Repo detection, scaffolding | [git-scm.com](https://git-scm.com/) |
| **GitHub CLI (`gh`)** | Setting repo secrets | [cli.github.com](https://cli.github.com/) |

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch

# Package as VSIX
npm run package
```

---

## Part of the MaintainabilityAI Framework

This extension is part of the [MaintainabilityAI](https://maintainability.ai) security-first SDLC framework. See the [workshop curriculum](https://maintainability.ai/docs/workshop/) for training materials.

> *"It's no use going back to yesterday, because I was a different person then."*
>
> Ship secure code today. The Cheshire Cat will be grinning.
