# Changelog

All notable changes to the MaintainabilityAI VSCode Extension will be documented in this file.

## [0.1.0] - 2026-02-17

### Added

- **RCTRO Feature Issue Creation** — Describe a feature in plain text, select OWASP/Maintainability/STRIDE prompt pack categories, and generate a complete RCTRO-formatted GitHub issue with LLM assistance
- **SDLC Scaffolding** — One-command setup for security-first project structure: CLAUDE.md, CodeQL workflow, CI workflow, Alice remediation workflow, fitness functions, PR template, security policy, and OWASP prompt packs
- **Security Scorecard** — Webview dashboard showing fitness functions (security compliance, dependency freshness, test coverage, complexity, technical debt, CI/CD health), SDLC completeness tracking, and one-click issue creation for improvements
- **Prompt Pack Browser** — Browse 23 bundled prompt packs across OWASP Top 10 (10), Maintainability (7), and STRIDE Threat Modeling (6) categories
- **Repository Secrets Configuration** — Set Anthropic and OpenAI API keys as GitHub Actions secrets via `gh` CLI with input validation and optional local storage
- **Multi-LLM Support** — VS Code Language Model API (Copilot), Anthropic Claude, and OpenAI providers for RCTRO generation
- **Auto Tech Stack Detection** — Automatically detects language, framework, testing tools, and package manager from project files
- **Issue Templates** — Pre-built templates (New API Endpoint, Authentication Feature, Data Processing Pipeline, Frontend Component) with curated prompt pack selections
- **Cheshire Cat Activity Bar** — Dedicated sidebar with tree view for quick access to all extension commands
