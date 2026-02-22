# White Rabbit — BAR Component Scaffolding & Implementation

**Version:** 0.1.0 — Design
**Date:** February 21, 2026
**Author:** Shawn McCarthy, VP & Chief Architect, Global Architecture, Risk and Governance

---

## Overview

The White Rabbit is a guided implementation workflow that bridges the gap between architecture definition (Looking Glass) and component implementation (Rabbit Hole). Named after the White Rabbit in *Alice in Wonderland* — always hurrying toward the next thing — it shepherds a new component repository from creation through scaffolding, issue creation, agent assignment, and progress tracking.

Today, three Cheshire experiences exist in isolation:
- **Looking Glass**: Portfolio dashboard, BAR management, CALM diagramming
- **Scaffold Panel**: SDLC file setup (CI workflows, CLAUDE.md, PR templates)
- **Rabbit Hole**: Issue management, agent assignment, and progress monitoring (entry point for feature creation is via the Security Scorecard's "Create Feature" button)

The White Rabbit connects them into a single flow: **Looking Glass → Scaffold Panel → Rabbit Hole → Security Scorecard**. Rather than building custom UI, it chains existing panels with smart hand-offs and pre-populated context.

---

## Capability Registration

Update `design/governance-mesh.md`:

| Capability | Character | Purpose | Status |
|------------|-----------|---------|--------|
| **White Rabbit** | White Rabbit | Component scaffolding: ScaffoldPanel → Rabbit Hole with BAR context | Design |

---

## UX Flow

### Primary Path: "Create New" from BAR Detail

```
┌─ Looking Glass: BAR Detail ──────────────────────────┐
│                                                        │
│  Linked Repositories                        [+ Add]   │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 📁 claims-api        https://github.com/...      │ │
│  │ 📁 claims-ui         https://github.com/...      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  🐇 Implement based on architecture          [Start]  │
│                                                        │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─ Repo Picker Modal ──────────────────────────────────┐
│  [Browse Org] [Add URLs] [Create New]                 │
│                                                        │
│  Create New tab:                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Repository URL:                                   │ │
│  │ https://github.com/org/new-component              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│                               [Cancel] [Add & Scaffold]│
└────────────────────────────────────────────────────────┘
                        │
          Repo added to app.yaml
                        │
                        ▼
┌─ Scaffold Panel (existing) ──────────────────────────┐
│                                                        │
│  Target Folder: [Select...]  (blank — user must pick)  │
│                                                        │
│  ☑ CLAUDE.md               ☑ GitHub Actions CI         │
│  ☑ PR template             ☑ CodeQL workflow           │
│  ☐ Snyk workflow           ☑ Fitness functions         │
│                                                        │
│  Project Configuration:                                │
│  Language: [TypeScript ▼]  Testing: [Jest ▼]           │
│                                                        │
│  ☑ Create GitHub repository                            │
│    Name: new-component                                 │
│    Visibility: [Private ▼]                             │
│                                                        │
│                                    [Scaffold Project]  │
│                                                        │
│ ─ ─ ─ ─ ─ ─ ─ On completion ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                        │
│  😺 The Cheshire Cat grins.                            │
│  Your project has been scaffolded and is ready to go.  │
│                                                        │
│  [Open Folder] [🐇 Create Component Feature]          │
│                                                        │
└────────────────────────────────────────────────────────┘
                        │
             "Create Component Feature"
                        │
                        ▼
┌─ Rabbit Hole (existing, pre-populated) ──────────────┐
│                                                        │
│  Phase: Input                                          │
│                                                        │
│  Describe your feature:                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ## Component: new-component — Claims Platform     │ │
│  │                                                    │ │
│  │ Scaffold a new implementation of this component    │ │
│  │ following the architecture below.                  │ │
│  │                                                    │ │
│  │ ### Architecture (CALM)                            │ │
│  │ { nodes, relationships, interfaces... }            │ │
│  │                                                    │ │
│  │ ### Architecture Decision Records                  │ │
│  │ - ADR-001: Use PostgreSQL — chosen for...          │ │
│  │                                                    │ │
│  │ ### Threat Model                                   │ │
│  │ STRIDE analysis summary...                         │ │
│  │                                                    │ │
│  │ ### Scaffold Guidelines                            │ │
│  │ { cheshire-scaffold-default.md content }           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ☐ Advanced Prompt Packs                               │
│    ┌──────────────────────────────────────────────┐   │
│    │ OWASP Top 10:                                │   │
│    │ ☑ A01 Broken Access Control                  │   │
│    │ ☑ A02 Cryptographic Failures                 │   │
│    │ ☑ A03 Injection                              │   │
│    │ ☐ A04 Insecure Design                        │   │
│    │ ☑ A05 Security Misconfiguration              │   │
│    │ ...                                           │   │
│    │ Maintainability:                              │   │
│    │ ☑ Complexity Reduction                        │   │
│    │ ☑ Dependency Hygiene                          │   │
│    │ ☑ Fitness Functions                           │   │
│    │ ...                                           │   │
│    │ STRIDE Threat Modeling:                        │   │
│    │ ☑ Spoofing   ☑ Tampering                      │   │
│    │ ☑ Information Disclosure                      │   │
│    │ ☑ Elevation of Privilege                      │   │
│    │ ...                                           │   │
│    └──────────────────────────────────────────────┘   │
│                                                        │
│                                    [Generate RCTRO]    │
│                                                        │
│  ─ ─ ─ Phase: Review ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  { RCTRO prompt review }                               │
│                               [Back] [Submit Issue]    │
│                                                        │
│  ─ ─ ─ Phase: Assign ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  [Claude] [Copilot] [Skip]                             │
│                                                        │
│  ─ ─ ─ Phase: Monitor ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  { Agent timeline, PR detection }                      │
│                                                        │
└────────────────────────────────────────────────────────┘
                        │
            After agent assignment
                        │
                        ▼
┌─ Component Repo — New Window ────────────────────────┐
│                                                        │
│  VS Code opens component repo folder                   │
│                                                        │
│  ┌──── Scorecard (Security Dashboard) ──────────┐    │
│  │                                                │    │
│  │  ┌── Active Review Banner ────────────────┐   │    │
│  │  │ ● Claude is implementing new-component  │   │    │
│  │  │   Issue #42    PR #43 Draft             │   │    │
│  │  └─────────────────────────────────────────┘   │    │
│  │                                                │    │
│  │  Repository Health Score: --                   │    │
│  │  (Pending first scan after agent completes)    │    │
│  │                                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│  Now in "code mode" on the component repo.             │
│  Rabbit Hole sidebar available for further issues.     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Step-by-Step

1. User is on BAR detail page → sees **"🐇 Implement based on architecture"** button below Linked Repos
2. Clicks button → **Repo Picker** opens with "Create New" tab active
3. User enters repo URL → clicks **"Add & Scaffold"**
4. Repo is added to `app.yaml` → **Scaffold Panel** opens with blank target folder
5. User goes through existing scaffold flow: pick folder → select files → project config → optionally create GitHub repo
6. Scaffold completion screen shows **"Create Component Feature"** button (🐇 icon)
7. Click → **Rabbit Hole** opens pre-populated with BAR architecture context in create mode
8. Description pre-filled with CALM, ADRs, threat model, scaffold guidelines
9. Prompt packs behind **"Advanced Prompt Packs"** checkbox — pre-selected with scaffold defaults
10. Normal Rabbit Hole flow: review description → **Generate RCTRO** → review → **Submit Issue** → **Assign Agent**
11. After assignment → open component repo folder + **Scorecard** (Security Dashboard) — we're now in code mode on the component repo

### Alternate Entry: Click Existing Repo

When a user clicks a linked repo row on the BAR detail and the repo is **not found locally**:

**Current behavior (preserved):**
```
"Repository 'repo-name' not found locally. Open Scaffold Panel to set up SDLC structure?"
  [Open Scaffold] [Cancel]
```

**New behavior (3 options):**
```
"Repository 'repo-name' not found locally."
  [🐇 Scaffold Component] [Open Scaffold] [Cancel]
```

- **Scaffold Component** → Opens ScaffoldPanel with BAR context (same as primary flow from step 4)
- **Open Scaffold** → Opens ScaffoldPanel without BAR context (existing behavior, unchanged)
- **Cancel** → Dismiss

### Existing Flows Preserved

The following flows remain completely unchanged:

| Flow | Entry Point | Behavior |
|------|-------------|----------|
| Browse Org tab | Repo Picker → "Browse Org" | Search org repos, checkbox select, add to BAR |
| Add URLs tab | Repo Picker → "Add URLs" | Paste URLs textarea, add to BAR |
| Repo found locally | Click linked repo row | Opens folder in new window + Scorecard |
| Standalone scaffold | Command palette → "Scaffold Project" | ScaffoldPanel opens normally (no BAR context) |
| Standalone Rabbit Hole | Sidebar → "Rabbit Hole" | Rabbit Hole opens in hub mode (issue list) |
| Create Feature | Scorecard → "Create Feature" button | Rabbit Hole opens in create mode |

---

## White Rabbit Button

A small White Rabbit icon button appears on the BAR detail page, below the Linked Repositories section. It is visible whenever the BAR has CALM architecture data (`bar.arch.json` exists).

```
Linked Repositories                                [+ Add]
┌──────────────────────────────────────────────────────┐
│ 📁 claims-api        https://github.com/org/...      │
│ 📁 claims-ui         https://github.com/org/...      │
└──────────────────────────────────────────────────────┘

🐇 Implement based on architecture
```

The button text reads **"🐇 Implement based on architecture"** and opens the repo picker modal with the "Create New" tab active.

---

## "Create New" Tab in Repo Picker

The repo picker modal (`renderRepoPickerModal()` at lookingGlass.ts:3122) currently has 2 tabs: **Browse Org** and **Add URLs**. A third tab, **Create New**, is added — visible only when `mode === 'add-to-bar'`.

### State Changes

```typescript
// In repoPickerModal state (lookingGlass.ts:335-347)
activeTab: 'browse' | 'urls' | 'create-new';   // Add 'create-new'
createNewRepoUrl: string;                         // New field
```

### Tab Content

Single URL input field:
- Placeholder: `https://github.com/org/new-component`
- Hint: "Enter the GitHub repository URL for the new component"
- CTA button text: **"Add & Scaffold"** (enabled when URL starts with `https://github.com`)

### Confirm Action

When user clicks "Add & Scaffold":
1. Send `addReposToBar` message → adds URL to `app.yaml`
2. Send `scaffoldComponent` message → triggers ScaffoldPanel with BAR context
3. Close modal

---

## Context Chain

The core architectural insight: BAR context flows through the panel chain via **pre-built description strings**, not custom message types.

```
┌─────────────────┐    ComponentScaffoldContext    ┌──────────────┐
│ LookingGlassPanel│ ─────────────────────────────→ │ ScaffoldPanel │
│                  │    { description, packs,       │              │
│ buildScaffold-   │      barName, barPath,         │ stores as    │
│ Description()    │      repoUrl }                 │ componentCtx │
└─────────────────┘                                └──────┬───────┘
                                                          │
                                          On completion:  │
                                     "Create Component    │
                                      Feature" button     │
                                                          │
                              ┌────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ IssueCreatorPanel │  (Rabbit Hole)
                    │                  │
                    │ createOrShow(    │
                    │   ctx,           │
                    │   description,   │  ← Pre-built markdown with CALM, ADRs,
                    │   packs          │     threat model, scaffold guidelines
                    │ )                │
                    └──────────────────┘
```

### `ComponentScaffoldContext` Type

```typescript
export interface ComponentScaffoldContext {
  barPath: string;
  barName: string;
  repoUrl: string;
  description: string;            // Pre-built markdown with all BAR context
  packs: PromptPackSelection;     // Pre-selected prompt packs for Rabbit Hole
}
```

### `buildScaffoldDescription()` — LookingGlassPanel

This method gathers all BAR context and produces a single markdown string:

1. `barService.readManifest(barPath)` → BAR name
2. `readCalmArchitectureData(barPath)` → CALM JSON (truncated to 5000 chars)
3. `barService.listAdrs(barPath)` → ADR summaries (id, title, status, decision)
4. Read `security/threat-model.yaml` from BAR path → threat model STRIDE summary (primary structured data; `threat-model.md` is a secondary Mermaid diagram)
5. `generateScaffoldPromptPack(extensionPath)` → load scaffold prompt pack content

**Output format:**
```markdown
## Component: {repoName} — {barName}

Scaffold a new implementation of this component following the architecture below.

### Architecture (CALM)
{CALM JSON — nodes, relationships, interfaces, truncated to 5000 chars}

### Architecture Decision Records
- ADR-{id}: {title} ({status}) — {decision}
...

### Threat Model
{threat model STRIDE summary}

### Scaffold Guidelines
{cheshire-scaffold-default.md full content}
```

### Pre-selected Prompt Packs

```typescript
packs: {
  owasp: ['A01_broken_access_control', 'A02_crypto_failures', 'A03_injection',
          'A05_security_misconfig', 'A07_authn_failures', 'A09_logging_monitoring', 'A10_ssrf'],
  maintainability: ['complexity-reduction', 'dependency-hygiene', 'fitness-functions'],
  threatModeling: ['spoofing', 'tampering', 'information-disclosure', 'elevation-of-privilege']
}
```

These are pre-selected but hidden behind an **"Advanced Prompt Packs"** checkbox in the Rabbit Hole. When the checkbox is unchecked (default), the pack selection area is collapsed — the user just sees the description and the scaffold prompt pack embedded in it. When checked, the full pack selection UI expands, letting the user add/remove individual packs.

---

## Default Scaffold Prompt Pack

**File:** `scaffolding/prompts/cheshire-scaffold-default.md`

A single-file summarized prompt pack analogous to `oraculum-default.md`. It gives the agent (Claude/Copilot) all security and maintainability context needed to scaffold a well-structured, secure codebase. This content is embedded directly in the Rabbit Hole description field.

### Structure

```markdown
# Component Scaffold — Default Prompt Pack

You are scaffolding a new code repository that implements a component of a governed
business application. Use the architecture context (CALM, ADRs, threat model) provided
in this issue to guide your implementation.

---

## OWASP Top 10 — Implementation Checklist

### A01: Broken Access Control
- Deny-by-default authorization middleware
- RBAC/ABAC with centralized role checks
- IDOR prevention: validate resource ownership on every request
- Restrictive CORS (no wildcard origins on authenticated endpoints)

### A02: Cryptographic Failures
- AES-256-GCM for encryption at rest, TLS 1.2+ in transit
- bcrypt (cost 12+) or Argon2 for password hashing
- Secrets via environment variables — never hardcode keys

### A03: Injection
- Parameterized queries ($1 placeholders) — no string concatenation
- Zod/Joi schema validation with allowlist regex on all inputs
- Output encoding for HTML contexts (XSS prevention)

### A04: Insecure Design
- Rate limiting on authentication and sensitive endpoints
- Cryptographically secure tokens for password reset, email verification
- Token expiration and single-use enforcement

### A05: Security Misconfiguration
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- No debug/dev features in production code paths
- Environment-specific configuration (dev/staging/prod)

### A06: Vulnerable Components
- Dependency pinning with lockfiles (committed)
- No eval() or dynamic code execution with remote content
- Regular dependency updates (3-month freshness rule)

### A07: Authentication Failures
- bcrypt with constant-time comparison
- Secure session cookies: httpOnly, secure, sameSite=strict
- JWT with RS256 or EdDSA, short expiration, refresh token rotation

### A08: Integrity Failures
- HMAC-SHA256 signatures for build artifacts and deployments
- SRI on CDN assets, lockfile checksum verification

### A09: Logging & Monitoring
- Structured JSON logging for all security events
- PII/secret masking in log output
- Log auth events (login, logout, failed login, permission denied)

### A10: SSRF
- URL allowlisting (domain + protocol)
- Block private IP ranges (RFC1918, loopback, link-local)
- Block cloud metadata endpoints (169.254.169.254)

---

## STRIDE Threat Modeling — Build-Time Controls

| Threat | Control |
|--------|---------|
| **Spoofing** | Strong auth (JWT/OAuth2), MFA where required, secure session management |
| **Tampering** | Input validation on all boundaries, HMAC integrity checks, parameterized queries |
| **Repudiation** | Structured audit logging, tamper-evident logs, security event tracking |
| **Information Disclosure** | Encryption at rest/in transit, data classification enforcement, generic errors |
| **Denial of Service** | Rate limiting, input size limits, circuit breakers, resource quotas |
| **Elevation of Privilege** | Deny-by-default RBAC, least privilege, centralized authorization middleware |

---

## Maintainability — Code Quality Gates

- **Cyclomatic complexity ≤ 10** per function
- **Single Responsibility** — one reason to change per module
- **DRY** — no duplicate business logic; extract shared utilities
- **Dependency hygiene** — pin versions, audit regularly, remove unused deps
- **Fitness functions** — automated quality gates in CI
- **Test coverage ≥ 80%** — unit tests for business logic, integration tests for APIs

---

## Expected Project Structure

- Source code implementing the CALM node interfaces
- Test directory with initial test stubs
- CI/CD workflow (GitHub Actions) with lint, test, security scan
- CLAUDE.md with project-specific agent instructions
- .github/PULL_REQUEST_TEMPLATE.md with security checklist
- Environment configuration (no secrets in code)
```

### Loading

Add to `src/templates/scaffoldTemplates.ts` alongside `generateOraculumDefaultPrompt()`:

```typescript
export function generateScaffoldPromptPack(extensionPath: string): string {
  return readScaffoldFile(extensionPath, 'prompts', 'cheshire-scaffold-default.md');
}
```

---

## Advanced Prompt Packs (Rabbit Hole Enhancement)

When the Rabbit Hole is opened via the White Rabbit flow, the prompt pack section is modified:

### Default State (collapsed)
```
☐ Advanced Prompt Packs
```
Packs are pre-selected but hidden. The scaffold default pack in the description provides the baseline guidance.

### Expanded State (when checked)
```
☑ Advanced Prompt Packs
┌──────────────────────────────────────────────┐
│ OWASP Top 10:                                │
│ ☑ A01 Broken Access Control                  │
│ ☑ A02 Cryptographic Failures                 │
│ ☑ A03 Injection                              │
│ ☐ A04 Insecure Design                        │
│ ☑ A05 Security Misconfiguration              │
│ ☐ A06 Vulnerable Components                  │
│ ☑ A07 Authentication Failures                │
│ ☐ A08 Integrity Failures                     │
│ ☑ A09 Logging & Monitoring                   │
│ ☑ A10 SSRF                                   │
│                                               │
│ Maintainability:                              │
│ ☑ Complexity Reduction                        │
│ ☑ Dependency Hygiene                          │
│ ☑ Fitness Functions                           │
│ ☐ DRY Principle                               │
│ ...                                           │
│                                               │
│ STRIDE Threat Modeling:                        │
│ ☑ Spoofing   ☑ Tampering                      │
│ ☐ Repudiation                                 │
│ ☑ Information Disclosure                      │
│ ☐ Denial of Service                           │
│ ☑ Elevation of Privilege                      │
└──────────────────────────────────────────────┘
```

### Implementation

In the Rabbit Hole webview (`main.ts`), the prompt pack section currently always renders expanded. When launched via White Rabbit (detected by pre-populated description + packs), wrap the pack section in a collapsible container:

```html
<div class="advanced-packs-toggle">
  <label>
    <input type="checkbox" id="advanced-packs-checkbox" />
    Advanced Prompt Packs
  </label>
</div>
<div id="pack-categories" class="pack-categories" style="display: none;">
  <!-- existing pack checkboxes -->
</div>
```

When `prefillDescription` message arrives with packs, set `state.isComponentMode = true`. In component mode:
- Pack section starts collapsed
- Toggle checkbox shows/hides pack categories
- Packs are still pre-selected (selection is set via `setSelectedPacks()` regardless of visibility)
- When generating RCTRO, selected packs are included whether visible or not

---

## Copilot Fix (Rabbit Hole)

The Rabbit Hole currently uses `@copilot` comments to trigger Copilot Coding Agent (IssueCreatorPanel.ts:412-418). The Oraculum discovered that **issue assignment** is the correct trigger mechanism (OracularPanel.ts:565-607).

### Current (broken)
```typescript
// IssueCreatorPanel.ts:412-418
await this.githubService.createIssueComment(
  owner, repo, issueNumber,
  '@copilot Please implement this feature...'
);
```

### Fixed (matching Oraculum pattern)
```typescript
// Assign Copilot as issue assignee — this triggers the Copilot coding agent
await this.githubService.assignIssue(
  owner, repo, issueNumber,
  ['copilot-swe-agent[bot]']
);
// Post context comment (no @copilot prefix — assignment triggers the agent)
await this.githubService.createIssueComment(
  owner, repo, issueNumber,
  'Please implement this feature following the RCTRO prompt and security guidelines above.'
);
```

Also fix `onApproveAgent()` (line 435-436) and `onReplanAgent()` (line 459) to remove `@copilot` mentions from comments.

---

## ScaffoldPanel Modifications

### Modified Signature

```typescript
// ScaffoldPanel.ts:35
public static createOrShow(
  context: vscode.ExtensionContext,
  componentContext?: ComponentScaffoldContext  // NEW optional param
)
```

### Instance Storage

```typescript
private readonly extensionContext: vscode.ExtensionContext;  // Store full context (for IssueCreatorPanel)
private componentContext?: ComponentScaffoldContext;           // BAR context for component flow
```

### Webview Notification

After sending `{ type: 'init', workspaceRoot }`, send component mode flag:
```typescript
if (this.componentContext) {
  this.send({
    type: 'componentMode',
    barName: this.componentContext.barName,
    repoUrl: this.componentContext.repoUrl
  });
}
```

### Completion Screen Enhancement

In the HTML template (line 845-873), add a second button after "Open Folder in VS Code":

```html
<button id="createComponentFeatureBtn" style="display: none;">🐇 Create Component Feature</button>
```

In the webview script:
- `componentMode` message → `state.isComponentMode = true`
- On `complete` message, if `state.isComponentMode`, show the button
- Button click → `vscode.postMessage({ type: 'createComponentFeature' })`

### New Message Handler

```typescript
case 'createComponentFeature': {
  if (this.componentContext) {
    IssueCreatorPanel.createOrShow(
      this.extensionContext,
      this.componentContext.description,
      this.componentContext.packs
    );
  }
  break;
}
```

---

## Post-Assignment: Scorecard (Security Dashboard)

After the agent is assigned in the Rabbit Hole, the workflow transitions to **code mode**:

1. **Open component repo folder** in a new VS Code window (`vscode.openFolder`)
2. **Open Scorecard** (`maintainabilityai.openScorecard`) in the new window
3. Scorecard shows the **active review banner** at the top with agent progress

The user is now working in the component repo, not the governance mesh. The Rabbit Hole sidebar entry is available for managing issues, the Scorecard for creating new features, and the scaffold command for further project setup.

### Component Review Tracking in Scorecard

The Scorecard panel needs to detect and display active component reviews:

1. On open, check `githubService.getActiveReviewForBar()` or a new `getActiveIssues()` for `component-scaffold` labeled issues
2. Display the active review banner (same style as Looking Glass)
3. Poll `githubService.getLinkedPullRequests()` every 30 seconds for PR detection
4. When PR is detected, update the banner with PR link and status

### Transition Mechanism

After `onAssignAgent()` completes in IssueCreatorPanel:
1. Store `{ repoUrl, issueNumber, issueUrl, agent }` in extension global state
2. If the scaffolded folder path is known (from ScaffoldPanel), open it: `vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true })`
3. In the new window, Scorecard auto-detects the repo and loads active review from stored state

The banner shows:
```
● Claude is implementing new-component
  Issue #42    PR #43 Draft
```

---

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `scaffolding/prompts/cheshire-scaffold-default.md` | **New.** Default scaffold prompt pack |
| 2 | `src/types/index.ts` | Add `ComponentScaffoldContext` type, `scaffoldComponent` message |
| 3 | `src/services/GitHubService.ts` | Add static `parseRepoUrl()` utility |
| 4 | `src/templates/scaffoldTemplates.ts` | Add `generateScaffoldPromptPack()` |
| 5 | `src/webview/LookingGlassPanel.ts` | `buildScaffoldDescription()`, modified `onOpenRepoInContext()`, `scaffoldComponent` handler |
| 6 | `src/webview/app/lookingGlass.ts` | White Rabbit button, "Create New" tab in repo picker |
| 7 | `src/webview/ScaffoldPanel.ts` | Accept `ComponentScaffoldContext`, completion transition |
| 8 | `src/webview/IssueCreatorPanel.ts` | Copilot fix (`assignIssue` instead of `@copilot` comment) — panel title already renamed to "Rabbit Hole" |
| 9 | `src/webview/app/main.ts` | "Advanced Prompt Packs" collapsible toggle in component mode — hub already renamed to "Rabbit Hole" |
| 10 | `design/governance-whiterabbit.md` | **New.** This design document |
| 11 | `design/governance-mesh.md` | Add White Rabbit to capability table, design docs, status |

---

## Key Patterns Reused

| Pattern | Source | Reuse |
|---------|--------|-------|
| Default prompt pack | `oraculum-default.md` in scaffolding/prompts/ | New `cheshire-scaffold-default.md` |
| Pack loading | `generateOraculumDefaultPrompt()` in scaffoldTemplates.ts:345 | New `generateScaffoldPromptPack()` |
| Rabbit Hole pre-population | `IssueCreatorPanel.createOrShow(ctx, desc, packs)` :34-37 | Pre-fill with BAR context |
| Prefill message handler | `main.ts` `prefillDescription` handler :1578-1589 | Resets state, fills textarea, selects packs |
| ScaffoldPanel completion | `ScaffoldPanel.ts` completion screen :845-873 | Add "Create Component Feature" button |
| Copilot assignment | `OracularPanel.onAssignAgent()` :565-607 | Fix `assignIssue(['copilot-swe-agent[bot]'])` |
| Active review banner | `renderActiveReviewBanner()` in lookingGlass.ts:3910 | Component implementation tracking |
| Active review polling | `startActiveReviewPolling()` in LookingGlassPanel.ts:815 | Component PR detection |
| CALM data reading | `readCalmArchitectureData()` in LayoutPersistenceService.ts:57 | Bundle into description |
| ADR listing | `barService.listAdrs()` in BarService.ts:487 | Bundle into description |
| Repo URL parsing | Inline at LookingGlassPanel.ts:784 | Centralized to `parseRepoUrl()` |

---

## Phase Tracking

| Step | Status | Description |
|------|--------|-------------|
| Design document | **Complete** | This document — `governance-whiterabbit.md` |
| Default scaffold prompt pack | Pending | `scaffolding/prompts/cheshire-scaffold-default.md` |
| Types & messages | Pending | `ComponentScaffoldContext`, `scaffoldComponent` message |
| `parseRepoUrl()` utility | Pending | Centralize URL parsing in GitHubService |
| `generateScaffoldPromptPack()` | Pending | Pack loader in scaffoldTemplates.ts |
| LookingGlassPanel handlers | Pending | `buildScaffoldDescription()`, modified dialog, `scaffoldComponent` |
| White Rabbit button | Pending | Button below Linked Repos in BAR detail |
| "Create New" tab | Pending | 3rd tab in repo picker modal |
| ScaffoldPanel component flow | Pending | Accept context, completion transition button |
| Copilot fix (Rabbit Hole) | Pending | `assignIssue` instead of `@copilot` comment |
| Advanced Prompt Packs toggle | Pending | Collapsible pack selection in component mode |
| Rabbit Hole rename | **Complete** | Sidebar "Rabbit Hole", hub redesign, "Create Feature" on Scorecard |
| Post-assignment transition | Pending | Open repo folder + Scorecard in code mode |
| Update governance-mesh.md | Pending | Capability table, design docs, status |
| Build verification | Pending | `node esbuild.js --production` — clean build |

---

## Verification

1. `cd vscode-extension && node esbuild.js --production` — clean build, no errors
2. Open Looking Glass → drill into a BAR with CALM data → White Rabbit button visible below Linked Repos
3. Click White Rabbit → Repo Picker opens with "Create New" tab active
4. "Browse Org" and "Add URLs" tabs still work exactly as before
5. Enter repo URL in "Create New" → "Add & Scaffold" enabled
6. Click "Add & Scaffold" → repo appears in Linked Repos + ScaffoldPanel opens with blank folder
7. Pick target folder → select files → scaffold → completion shows "Open Folder" AND "🐇 Create Component Feature"
8. Click "Create Component Feature" → Rabbit Hole opens in create mode with BAR context in description + packs pre-selected but collapsed
9. Expand "Advanced Prompt Packs" → individual packs visible with pre-selected checkboxes
10. Generate RCTRO → review → Submit Issue → issue created in target repo
11. Assign agent: Claude → `@claude` comment; Copilot → assigned via `assignIssue(['copilot-swe-agent[bot]'])`
12. After assignment → component repo folder opens in new window + Scorecard with active review banner
13. Click repo row for unfound repo → dialog shows 3 options: "🐇 Scaffold Component" / "Open Scaffold" / "Cancel"
14. "Scaffold Component" follows same flow from step 6
15. "Open Scaffold" opens standalone ScaffoldPanel (existing behavior unchanged)
16. Standalone scaffold (command palette) → no White Rabbit button on completion, no component mode
17. Standalone Rabbit Hole (sidebar) → opens in hub mode, no component mode, packs expanded as normal
18. Scorecard "Create Feature" → opens Rabbit Hole in create mode, packs expanded as normal
