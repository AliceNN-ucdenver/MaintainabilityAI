# MaintainabilityAI

[![CI](https://img.shields.io/github/actions/workflow/status/AliceNN-ucdenver/MaintainabilityAI/pages.yml?label=Build%20%26%20Pages)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#)
[![Security Scans](https://img.shields.io/badge/Snyk-CodeQL%20%26%20Snyk-blue)](#)

> **MaintainabilityAI** — a hands-on starter kit for **security-first AI-assisted engineering**.  
> Uses a bold **Tailwind** marketing site + a nested docs section, a full **OWASP A01–A10 prompt pack**, **insecure code samples** to remediate, and **checks** (CodeQL, Snyk, ESLint/Jest) to keep you honest.

## 🚀 Quick Start

```bash
# 1) Install dependencies
npm install

# 2) Build the site & docs
npm run build

# 3) Run local dev server for the Tailwind site
npm run dev

# 4) Run tests and linters
npm test
npm run lint
```

GitHub Pages is pre-wired via Actions to publish the **Tailwind site** (at `/`) and place the docs at **`/docs/`**.

## 📚 OWASP Top 10 (2021) Overview

| ID  | Title                                   | Short Description |
|-----|-----------------------------------------|-------------------|
| A01 | Broken Access Control                   | Missing/weak authorization, IDOR, privilege escalation |
| A02 | Cryptographic Failures                  | Weak/incorrect crypto, plaintext secrets |
| A03 | Injection                               | SQL/NoSQL/OS/LDAP/Template injection |
| A04 | Insecure Design                         | Missing threat modeling, unsafe patterns |
| A05 | Security Misconfiguration               | Defaults, verbose errors, headers, CORS |
| A06 | Vulnerable and Outdated Components      | Known-vuln dependencies, unpinned versions |
| A07 | Identification and Authentication Failures | Weak auth, session issues |
| A08 | Software and Data Integrity Failures    | Supply chain, signed artifacts, CICD gaps |
| A09 | Security Logging and Monitoring Failures| Missing/insufficient logs/alerts |
| A10 | Server-Side Request Forgery (SSRF)      | Unvalidated outbound requests |

> ✅ We include **insecure TypeScript examples** for A01–A10 in `examples/owasp/*` + **prompts** to remediate with Claude Code, Copilot, or ChatGPT in `prompts/owasp/*`.

## 🧪 Security Workflow (Workshop Flow)

```mermaid
flowchart LR
  A[Design Intent] --> B[Security-First Prompt\n(OWASP pack)]
  B --> C[AI Suggestion\n(Claude/Copilot/ChatGPT)]
  C --> D[Local Checks\nESLint/Jest]
  D --> E[Pre-commit Scans\nSnyk Code]
  E --> F[PR + CI/CD\nCodeQL & Snyk]
  F --> G[Human Review\nGolden Rules]
  G --> H[Merge]
```

### The Golden Rules of Vibe Coding (Governance)

1. **Be specific** about intent and constraints.  
2. **Trust but verify** — never merge code you don’t understand.  
3. Treat AI like a **keen junior dev** — guide and review.  
4. **Isolate AI changes** in separate commits/PRs; label them.  
5. **Document rationale** (what/why), not just the code.  
6. **Share winning prompts** — build a team prompt library.  

## 🧭 Repository Structure

```
/site-tw           # Tailwind marketing site (main site)
  /src
  index.html
  agenda.html

/docs               # Markdown docs compiled to static HTML (nested at /docs)
  index.md
  workshop.md
  owasp/*.md

/examples
  /owasp/A01..A10   # Insecure TS examples + some Jest tests

/prompts/owasp      # Prompt packs per A01..A10

.github/workflows/pages.yml   # Builds site + docs into one Pages artifact
.github/PULL_REQUEST_TEMPLATE.md
.github/SECURITY.md

.eslintrc.cjs
jest.config.ts
tsconfig.json
package.json
snyk.policy
```

## 🛡️ Example: Remediate Injection (A03)

Below shows using **Claude Code** in VS Code to safely fix `examples/owasp/A03_injection/insecure.ts` and make tests pass.

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection.

Context:
- Node 18 + TypeScript
- PostgreSQL using `pg`
- We must use parameterized queries only (no string concatenation)
- Validate inputs with Zod; length limits; allowlist where possible
- Ensure errors never leak schema details

Task:
1) Refactor `examples/owasp/A03_injection/insecure.ts` to use prepared statements.
2) Add validation to `searchUsers` to allow only [a-z0-9 _.-] and length <= 100.
3) Ensure function returns typed results and logs safely.
4) Run tests in `examples/owasp/A03_injection/__tests__/injection.test.ts` and make them green.

Checklist:
□ Prepared statements only (pg.query with $1 placeholders)
□ Validation via Zod
□ Output encoding if rendering
□ Never log raw user input without sanitization
```

Then run:
```bash
npm test -w examples
```

If failures mention injection vectors, iterate with the **Injection Prompt Pack** from `prompts/owasp/A03_injection.md`.

---

## 🔧 Local Dev / Build

- `npm run dev` → Vite dev server for Tailwind site  
- `npm run build` → builds site and docs into `site-tw/dist` for Pages  
- `npm run docs` → converts Markdown in `/docs` → static HTML in `site-tw/dist/docs`  
- `npm run test` → runs Jest tests under `/examples`  
- `npm run lint` → ESLint (TS)  

## 📜 License

MIT
