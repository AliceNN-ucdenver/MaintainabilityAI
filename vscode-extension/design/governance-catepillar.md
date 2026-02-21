# Cheshire: Caterpillar Architecture Review
## Requirements Specification

**Version:** 1.0.0 — Complete
**Date:** February 19, 2026 (completed February 21, 2026)
**Author:** Shawn McCarthy, VP & Chief Architect, Global Architecture, Risk and Governance

---

## 1. Overview

The Caterpillar is a Cheshire capability that automates architecture review by connecting the Looking Glass governance dashboard to Claude Code via GitHub Issues and GitHub Actions. Named for the Caterpillar in Alice in Wonderland who asks the fundamental question "Who are you?", this capability asks the same question of every business application: does your code match your documented architecture?

The Caterpillar bridges the gap between governance artifacts (stored in the BAR) and code reality (stored across component repositories). It creates a structured GitHub Issue in the governance mesh repository containing a prompt pack and the list of repositories to review, then triggers a GitHub Action that checks out all relevant code and runs Claude Code to perform the analysis. Claude compares the documented architecture (CALM diagrams, threat model, data classification, service mapping) against the actual code and posts findings back to the issue.

### 1.1 The Problem

Architecture drift is invisible. An architect documents a logical architecture showing three containers communicating via gRPC. Over six months, a team adds a fourth container, switches two integrations to REST, and introduces a direct database dependency that bypasses the API layer. None of these changes are reflected in the BAR. The governance artifacts describe a system that no longer exists.

Manual architecture review catches some of this, but it is periodic, incomplete, and does not scale. A Chief Architect overseeing hundreds of BARs cannot review every application's code against its documented architecture on a meaningful cadence.

The Caterpillar automates this. It gives every BAR a reviewable, auditable, AI-powered architecture analysis that runs on demand or on schedule, and produces findings that map directly to the four governance pillars.

### 1.2 Design Principles

**BAR as expected state, code as actual state.** The BAR documents what the architecture should be. The code repositories contain what the architecture actually is. The Caterpillar identifies the delta.

**Issue as the unit of review.** Each architecture review is a GitHub Issue in the governance mesh repository. The issue contains everything needed to execute the review: the BAR reference, the repo list, the prompt pack, and the review scope. When Claude completes the analysis, findings are posted as comments on the same issue. The issue becomes a complete, auditable review record.

**Prompt packs are composable.** The review instructions sent to Claude are structured prompt packs that can be customized per review type, per pillar, or per application criticality. A critical financial application gets a different (more thorough) prompt pack than an internal tooling application.

---

## 2. User Flow

### 2.1 Initiating a Review from Looking Glass

1. Architect opens the Looking Glass dashboard (`cheshire.lookingGlass`).
2. The dashboard displays the portfolio of BARs with governance health scores.
3. Architect selects a BAR (or multiple BARs) and clicks the **Caterpillar** action (hookah-smoking caterpillar icon, tooltip: "Who are you? Architecture Review").
4. A review configuration panel opens with:
   - **BAR:** Pre-selected from the dashboard (editable).
   - **Review scope:** All four pillars (default) or a subset (architecture only, security only, etc.).
   - **Prompt pack:** Default or custom. The default pack covers architectural drift, dependency analysis, security posture, and operational readiness.
   - **Repo list:** Auto-populated from `app.yaml`'s component repo index. The architect can include or exclude specific repos.
5. Architect clicks "Create Review."
6. Cheshire opens the governance mesh repository's Issues tab in the browser with the issue pre-populated.
7. Architect reviews the issue content and submits.

### 2.2 Alternative: Direct Issue Creation

Architects who prefer to work directly in GitHub can create a Caterpillar review issue manually using the issue template (see Section 4). The GitHub Action triggers on the label regardless of how the issue was created.

### 2.3 Review Execution

1. The GitHub Action triggers when an issue is created or labeled with `caterpillar-review`.
2. The action parses the issue body's structured YAML block for the BAR path and repo list.
3. The action checks out the governance mesh repository (which contains the BAR).
4. The action dynamically checks out each code repository listed in the review into a workspace subdirectory.
5. Claude Code runs with the full workspace available: BAR artifacts in one directory tree, code repos in adjacent directory trees.
6. Claude performs the analysis defined by the prompt pack.
7. Claude posts findings as structured comments on the issue.
8. The action updates the issue labels with the review result (`review-pass`, `review-findings`, `review-critical`).

### 2.4 Review Findings

Claude posts findings organized by governance pillar:

- **Architecture Drift:** Components in code not in CALM diagrams, relationships in code not documented, technology mismatches (CALM says gRPC, code uses REST).
- **Security Findings:** Code patterns inconsistent with threat model, dependencies with known vulnerabilities not in threat model scope, authentication/authorization patterns that diverge from documented security posture.
- **Information Risk Findings:** Data handling that contradicts data classification, PII exposure in components not flagged in data classification YAML, third-party integrations not in VISM.
- **Operations Findings:** Services in code not in service mapping, dependency chains not reflected in runbook, health check and observability gaps.

Each finding includes: severity (critical/high/medium/low), the specific file(s) and line(s) in code, the corresponding BAR artifact that conflicts, and a recommended action.

---

## 3. Technical Architecture

### 3.1 The Multi-Repo Checkout Problem

The core technical challenge is that Claude Code needs local access to both the BAR (in the governance mesh repo) and all component code repositories (separate repos listed in the BAR's `app.yaml`). The solution is a two-phase checkout in the GitHub Action workflow: first checkout the mesh repo to access the BAR, then dynamically checkout each code repo into the workspace.

### 3.2 Workspace Layout

After checkout, the GitHub Action workspace looks like this:

```
/workspace/
|
+-- mesh/                                 # Governance mesh repo (checked out first)
|   +-- bars/
|       +-- claims-processing/            # The BAR being reviewed
|           +-- app.yaml
|           +-- architecture/
|           |   +-- context.calm.json
|           |   +-- logical.calm.json
|           |   +-- component.calm.json
|           +-- security/
|           |   +-- threat-model.json
|           +-- information-risk/
|           |   +-- ira.md
|           |   +-- data-classification.yaml
|           |   +-- vism.yaml
|           +-- operations/
|               +-- service-mapping.yaml
|               +-- application-runbook.md
|
+-- repos/                                # Code repos (checked out dynamically)
    +-- claims-api/                       # First repo from app.yaml
    |   +-- src/
    |   +-- package.json
    |   +-- ...
    +-- claims-processor/                 # Second repo from app.yaml
    |   +-- src/
    |   +-- pom.xml
    |   +-- ...
    +-- claims-ui/                        # Third repo from app.yaml
        +-- src/
        +-- package.json
        +-- ...
```

Claude Code sees this entire tree as a local filesystem. The prompt pack tells Claude where the BAR artifacts are and where the code repos are.

### 3.3 GitHub Action Workflow

The implemented workflow (`scaffolding/workflows/oraculum-review.yml`) triggers on `issue_comment` events (not `issues: labeled`) and requires both the `oraculum-review` label and an `@claude` or `@copilot` mention in the comment body. This two-step trigger prevents accidental workflow runs when labels are added.

**Workflow steps:**

1. **Checkout mesh repo** at workspace root (required by `claude-code-action` for git operations)
2. **Parse review configuration** from the `oraculum` YAML block in the issue body
3. **Clone code repositories** into `repos/` subdirectories (normalizes full URLs to `owner/repo`, continues on individual failures)
4. **Run Claude Code** via `anthropics/claude-code-action@v1` with a prompt referencing the BAR and prompt pack
5. **Label review complete** on success (`review-complete` label)

See `scaffolding/workflows/oraculum-review.yml` for the full implementation.

### 3.4 Passing Context to Claude Code

The prompt pack file (stored in the BAR or in a shared `.caterpillar/` directory) provides Claude with:

1. **Workspace orientation:** Where the BAR artifacts are, where the code repos are, and how they map to each other.
2. **Review instructions:** What to analyze, organized by pillar.
3. **Output format:** How to structure findings so they are parseable by the Looking Glass dashboard.
4. **Severity criteria:** What constitutes critical vs. high vs. medium vs. low.

Example prompt pack header (stored as `.caterpillar/prompts/default.md`):

    # Caterpillar Architecture Review

    ## Workspace
    - BAR location: `bars/claims-processing/`
    - Code repos: `repos/` (each subdirectory is a component repo)
    - BAR app.yaml maps repo names to their roles in the application

    ## Instructions
    You are performing an architecture review of the {{bar_name}} business application.
    Your job is to compare the documented architecture (in the BAR) against the actual
    code (in the repos) and identify drift, gaps, and risks across four governance pillars.

    ## Output Format
    Post findings as a single comment with the following structure: ...

### 3.5 Structured Findings Format

Claude posts findings in a structured format that the Looking Glass dashboard can parse to update governance health scores:

```markdown
## Caterpillar Review: Claims Processing

### Summary
| Pillar | Findings | Critical | High | Medium | Low |
|--------|----------|----------|------|--------|-----|
| Architecture | 4 | 0 | 2 | 1 | 1 |
| Security | 2 | 1 | 1 | 0 | 0 |
| Information Risk | 1 | 0 | 0 | 1 | 0 |
| Operations | 3 | 0 | 1 | 2 | 0 |

### Architecture Findings

**[HIGH] Undocumented container: notification-service**
- Location: `repos/claims-processor/src/services/notification/`
- Expected: Not present in `logical.calm.json`
- Actual: Full service implementation with REST endpoints and SQS integration
- Action: Add notification-service container to logical diagram or remove from code

**[HIGH] Integration protocol mismatch: claims-api to claims-processor**
- Location: `repos/claims-api/src/clients/processorClient.ts:42`
- Expected: gRPC (per logical.calm.json relationship rel-003)
- Actual: REST via HTTP/JSON
- Action: Update logical diagram relationship or migrate code to gRPC

...
```

### 3.6 GitHub Token and Cross-Repo Access

The GitHub Action needs read access to all code repositories listed in the BAR. Options:

- **Organization-level GitHub App:** Install a GitHub App on the organization with read access to relevant repos. The action uses the app's installation token for checkout. This is the recommended approach for enterprises.
- **Fine-grained PAT:** A personal access token scoped to the repos. Stored as a repository secret. Simpler but tied to an individual.
- **GITHUB_TOKEN with workflow permissions:** Only works if all repos are in the same organization and the mesh repo's workflow has appropriate permissions. May require `contents: read` on external repos via repository settings.

For Manulife's use case, the GitHub App approach is recommended since it provides organization-wide access without tying permissions to an individual.

---

## 4. Issue Template

The governance mesh repository includes an issue template for Caterpillar reviews:

The issue body is generated programmatically by `ReviewService.buildIssueBody()` and contains:

- **Review Configuration** — an `oraculum` fenced YAML block with `bar_path`, `prompt_pack`, `scope`, and `repos`
- **Review Context** — user-provided additional context or default text
- **Prompt Pack** — full prompt pack markdown content in a collapsible `<details>` section
- **Implementation Zone** — `@claude` and `@copilot` assignment instructions
- **Metadata** — creation timestamp, extension version, pillars (collapsed)

Example `oraculum` config block in the issue body:

    bar_path: platforms/web-api/bars/claims-processing
    prompt_pack: default
    scope:
      - architecture
      - security
      - risk
      - operations
    repos:
      - https://github.com/org/claims-api
      - https://github.com/org/claims-processor
      - https://github.com/org/claims-ui

When Cheshire creates the issue from the Looking Glass dashboard, it populates the template automatically from the selected BAR's `app.yaml`.

---

## 5. Prompt Pack Library

### 5.1 Default Prompt Pack

The default prompt pack covers all four pillars with standard depth. Suitable for routine periodic reviews and for applications at medium criticality.

**Architecture analysis:**
- Compare containers and services in code against `logical.calm.json`
- Identify undocumented components (code exists, not in CALM)
- Identify phantom components (in CALM, no corresponding code)
- Verify integration protocols match documented relationships
- Check for dependency cycles not reflected in architecture

**Security analysis:**
- Compare authentication and authorization patterns against threat model
- Identify data flows that cross trust boundaries without documented controls
- Check dependency manifests (package.json, pom.xml, requirements.txt) for known vulnerabilities
- Verify secrets management patterns (no hardcoded credentials, proper vault usage)

**Information risk analysis:**
- Trace data handling in code against data-classification.yaml
- Identify PII/sensitive data processing in components not flagged for it
- Check for third-party API calls not documented in vism.yaml
- Verify encryption patterns for data at rest and in transit

**Operations analysis:**
- Compare service startup and health check implementations against runbook
- Verify service-to-service dependencies match service-mapping.yaml
- Check for observability instrumentation (logging, metrics, tracing)
- Identify configuration management patterns and environment handling

### 5.2 Critical Application Prompt Pack

Extended analysis for applications at critical or high criticality (as defined in `app.yaml`). Includes everything in the default pack plus:

- Deep dependency tree analysis (transitive dependencies, license compliance)
- Code complexity metrics for core business logic components
- Error handling and resilience pattern review (circuit breakers, retries, fallbacks)
- Data retention and purging compliance checks
- API versioning and backward compatibility analysis

### 5.3 Security-Focused Prompt Pack

Targeted review for applications flagged by the security pillar. Narrower scope but deeper analysis:

- OWASP Top 10 pattern analysis across all repos
- Authentication flow tracing end-to-end
- Authorization model consistency (RBAC/ABAC patterns)
- Input validation and output encoding audit
- Cryptographic implementation review

### 5.4 Custom Prompt Packs

Prompt packs are markdown files stored in the governance mesh repository under a shared `.caterpillar/prompts/` directory:

```
/.caterpillar/
+-- prompts/
    +-- default.md
    +-- critical.md
    +-- security-focused.md
    +-- custom-ai-model-review.md
```

Organizations can create custom prompt packs for specific review needs (AI model governance, regulatory compliance, migration readiness). Custom packs follow the same structure as the default pack and are selectable from the Looking Glass review configuration panel.

### 5.5 Prompt Pack Registry

Prompt packs are governed by a registry file (`.caterpillar/prompts/registry.yaml`) that controls UI ordering, descriptions, and domain grouping. The registry is deployed by the extension during mesh initialization and workflow provisioning.

**Multi-select model:** Every review includes the Default pack (always checked, non-removable). Architects check additional domain packs to deepen coverage in specific areas. All selected packs are concatenated into the issue body (each in its own collapsible `<details>` section) and the review agent reads each pack's instructions.

**Registry format:**
```yaml
packs:
  - id: default          # matches filename without .md
    name: Default
    description: "Full BAR artifact inventory and 4-pillar governance review baseline"
    domain: general       # grouping: general, architecture, security, information-risk, operations
    required: true        # if true, always included in every review
```

**Shipped domain packs** (deployed during mesh init / workflow provisioning):
- `default.md` — Full BAR artifact inventory, CALM 1.2 model reference, 4-pillar baseline analysis, output format
- `architecture.md` — CALM drift detection, ADR compliance, fitness function validation, quality attribute verification, component boundary analysis
- `information-risk.md` — Data classification compliance, PII detection, VISM audit, privacy impact, encryption audit
- `operations.md` — Service mapping verification, runbook accuracy, SLA targets, observability assessment, incident response readiness
- `application-security.md` — OWASP Top 10 patterns, threat model compliance, dependency vulnerabilities, secrets management

**Custom pack auto-discovery:** `.md` files in `.caterpillar/prompts/` not listed in the registry are shown in the UI as "Custom" domain packs with metadata extracted from the file's heading and first paragraph.

**Enhanced Default pack:** The Default prompt describes the complete BAR directory structure — every artifact file by path, format, and purpose — and explains the CALM 1.2 architecture model (nodes, relationships, flows, controls). This gives the review agent maximum context about the documented "expected state" before it examines the code.

---

## 6. Looking Glass Integration

### 6.1 Review Status on Dashboard

The Looking Glass dashboard displays review status for each BAR:

- **Last review date:** When the most recent Caterpillar review completed.
- **Review result:** Pass (green), findings (yellow), critical findings (red), or never reviewed (gray).
- **Finding count:** Total open findings by severity.
- **Link to issue:** Direct link to the GitHub Issue with full findings.

### 6.2 Governance Health Score Impact

Caterpillar review results feed into the BAR's governance health score on the Looking Glass dashboard. A BAR with critical findings unresolved has its composite score reduced. The score impact is configurable:

- Critical finding: -15 points per finding (from composite score, max 100)
- High finding: -5 points per finding
- Medium finding: -2 points per finding
- Low finding: -1 point per finding (informational, does not reduce below threshold)

### 6.3 Scheduled Reviews

The Looking Glass dashboard supports configuring scheduled reviews per BAR. The schedule creates issues automatically on a cadence:

- **Critical applications:** Monthly (default)
- **High applications:** Quarterly (default)
- **Medium applications:** Semi-annually (default)

Schedules are implemented via a GitHub Actions cron workflow that creates Caterpillar issues on the configured cadence.

---

## 7. Cheshire Command Integration

| Command | ID | Behavior |
|---------|-----|----------|
| **Caterpillar** | `cheshire.caterpillar` | Opens review configuration panel for the selected BAR. Creates a pre-populated GitHub Issue in the mesh repo. Available from the Looking Glass dashboard and the command palette. |

The Caterpillar action is accessible from:
1. **Looking Glass dashboard:** Click the Caterpillar icon on any BAR card.
2. **Rabbit Hole view:** Context menu action when viewing a specific BAR's design surface.
3. **Command palette:** `Cheshire: Caterpillar Review` with BAR picker.

---

## 8. MVP Phasing

> **Implementation note:** The Caterpillar capability was implemented in the VS Code extension under the name **"Oraculum"** (the Oracle). The label `oraculum-review` replaces `caterpillar-review` and the YAML config block uses the `oraculum` fence marker. All design principles, issue format, and prompt pack structure remain as specified in this document.

### Phase 1: Manual Issue Creation with Action

- [x] GitHub Action workflow triggers on `@claude`/`@copilot` comment (`scaffolding/workflows/oraculum-review.yml`)
- [x] Multi-repo checkout from structured YAML block in issue body (parses oraculum fenced block)
- [x] URL normalization — handles both full GitHub URLs and `owner/repo` format
- [x] Per-repo error handling — individual clone failures don't stop the workflow
- [x] Default prompt pack with four-pillar analysis (`scaffolding/prompts/oraculum-default.md`)
- [x] Claude Code posts findings as issue comment via `anthropics/claude-code-action@v1`
- [x] `review-complete` label added on successful workflow completion
- [x] Issue template in mesh repository (scaffolded during `writeOraculumWorkflow()`, editable from Settings)
- [x] Manual issue creation — any user can create a properly formatted issue on the mesh repo

**Value:** Architecture reviews can run against real code with BAR artifacts as the baseline. The workflow is usable immediately by anyone who can create a GitHub Issue.

### Phase 2: Looking Glass Integration (Shipped as "Oraculum")

- [x] Oraculum action on Looking Glass dashboard ("Review" button on BAR detail page)
- [x] Auto-populate issue from `app.yaml` repo list (repos pre-selected from BAR)
- [x] Hub/Create/Manage pattern — hub lists issues, create configures/submits, manage assigns/monitors/shows results
- [x] Issue created programmatically via GitHub API (no browser redirect needed)
- [x] Prompt pack content included in issue body as collapsible details section
- [x] Implementation Zone in issue body with `@claude` / `@copilot` assignment instructions
- [x] 3-card agent selection — Claude/Alice, Copilot, Skip (matches Cheshire Cat pattern)
- [x] `@claude` / `@copilot` comment posted on issue to trigger workflow
- [x] Full monitor timeline — avatars, bot badges, timestamps, markdown rendering
- [x] Agent status detection from labels and comment text
- [x] Approve/replan banner — post `@claude approved` or feedback comments
- [x] PR detection banner with checks status
- [x] Auto-transition to results when `review-complete` label detected
- [x] Results phase renders full review report as markdown
- [x] Close Issue button on results page
- [x] Issue state detection — clicking completed issue from hub goes to results, active goes to monitor
- [x] IssueMonitorService reuse — polls for comments, labels, PR status in real-time
- [x] Mesh repo detection from `git remote get-url origin` on mesh directory
- [x] Workflow existence check — detects if `oraculum-review.yml` exists on the mesh repo
- [x] Workflow deploy/redeploy — always-visible button on hub, re-checks on refresh
- [x] ANTHROPIC_API_KEY secret configuration during `initMesh` flow
- [x] Command palette: `MaintainabilityAI: Oraculum — Architecture Review`
- [x] Review metrics parsed from summary table and saved to `app.yaml` `reviews:` section
- [x] Close Issue replaced with Open Issue / Open PR / Back to Reviews on results page
- [x] Design Drift indicator on BAR detail — score ring with expandable review history
- [x] Review history links open GitHub issues in browser via `openUrl` handler
- [x] Display review status (drift score badge) on Looking Glass BAR table
- [x] Link from BAR table to completed review issues (issue number link)
- [x] Settings gear on Looking Glass portfolio header with inline settings panel
- [x] Workflow deploy/redeploy moved from Oraculum hub to Looking Glass Settings
- [x] Issue template editor for `.github/ISSUE_TEMPLATE/oraculum-review.yml`
- [x] LLM model preference selector persisted to VS Code workspace settings
- [x] Preferred model family respected across all LLM-powered features (threat model, org scan, policy generation, top findings)
- [x] Danger Zone: mesh reinitialization with double confirmation and auto-push
- [x] Top findings summary (tophat button) — LLM-powered per-pillar bullet summary from latest review report

**Value:** Architects trigger reviews from the governance dashboard without manually constructing issue YAML. The full workflow — from BAR selection to monitoring Claude's findings to reading the report — runs inside VS Code.

### Phase 3: Prompt Pack Library and Scoring

- [x] Prompt pack selector in review configuration panel (scans `.caterpillar/prompts/` directory)
- [x] Prompt pack content loaded and embedded in issue body
- [x] Default prompt pack shipped with extension
- [x] **YAML registry** (`registry.yaml`) for prompt pack metadata — controls UI display order and descriptions
- [x] **Multi-select UI** — checkboxes replace single-select dropdown; Default always included (non-removable)
- [x] **Enhanced default prompt** — full BAR artifact inventory (CALM 1.2 model, ADRs, fitness functions, quality attributes, threat model, all 4 pillars)
- [x] **Architecture domain prompt pack** — CALM drift, ADR compliance, fitness functions, quality attributes, component boundary analysis
- [x] **Information Risk domain prompt pack** — data classification, PII tracing, VISM vendor mapping, privacy impact, encryption audit
- [x] **Operations domain prompt pack** — service mapping, SLA verification, runbook accuracy, observability, incident response
- [x] **Application Security domain prompt pack** — OWASP Top 10, threat model compliance, dependency vulnerability analysis, secrets management
- [x] **Custom prompt pack auto-discovery** — `.md` files not in registry shown as "Custom" domain
- [x] **Multi-pack issue body** — each selected pack in its own collapsible `<details>` section; `prompt_packs` YAML list in config block
- [x] **Workflow multi-pack support** — `prompt_packs` list parsed with backward compat for `prompt_pack` singular
- [x] **Scaffolding deploys all packs** — `writeOraculumWorkflow()` deploys registry + default + 4 domain packs
- [x] Governance health score integration (drift score from severity weights in section 6.2)
- [x] Finding severity thresholds (drift weights) configurable in Settings, persisted to `mesh.yaml`

**Value:** Reviews are tailored to application criticality and specific governance concerns. Architects compose review scope by selecting domain packs that add depth to specific pillars. The Default pack provides a comprehensive BAR artifact inventory — listing every file by path, format, and purpose — giving the review agent full context of all documented governance artifacts. Review results directly impact the governance health metrics that drive portfolio-level decisions.

---

## 9. Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Named "Caterpillar" after Alice's Caterpillar | The Caterpillar asks "Who are you?" which is the fundamental architecture review question: does the code match the documented identity? |
| D2 | GitHub Issue as the unit of review | Issues are auditable, commentable, linkable, and integrate natively with GitHub Actions. They provide a permanent record of every review. |
| D3 | Multi-repo checkout in GitHub Action, not in Claude Code | The action workflow handles repo checkout before Claude runs. Claude sees a flat local filesystem. This avoids giving Claude direct Git credentials and keeps the checkout logic in declarative YAML. |
| D4 | Prompt packs stored in the mesh repo | Centralized prompt management. All BARs use the same review standards. Changes to prompt packs are version-controlled and PR-reviewed, applying governance to the governance process itself. |
| D5 | Structured YAML block in issue body for config | The issue body is self-contained. The action parses it directly. No external configuration files needed per review. The issue is the complete specification of what to review. |
| D6 | Findings posted as issue comments, not separate files | Comments keep everything in one place. The issue thread becomes the review conversation. Architects can respond to specific findings, ask for re-review, or mark findings as accepted risk. |
| D7 | Organization-level GitHub App for cross-repo access | Enterprise-appropriate. No personal tokens. Scoped permissions. Auditable. Aligns with Manulife's security requirements for automated tooling. |
| D8 | Governance health score reduction for open findings | Creates a feedback loop. Unresolved drift reduces the BAR's health score on the Looking Glass dashboard, making architectural debt visible at the portfolio level and creating incentive for remediation. |
| D9 | Renamed to "Oraculum" in implementation | "Oraculum" (the Oracle) fits the Alice in Wonderland naming better alongside "Looking Glass" and "Cheshire." The label `oraculum-review` replaces `caterpillar-review`. All other design decisions remain unchanged. |
| D10 | Two-step issue creation: create then comment | The issue is created first without the trigger label. The `oraculum-review` label is added and an `@claude`/`@copilot` comment posted in a separate "Assign Agent" step. The workflow triggers on the comment, not the label — giving architects explicit control and preventing accidental workflow triggers. |
| D11 | Workflow provisioning as extension capability | Rather than requiring manual workflow setup, the extension detects if `oraculum-review.yml` exists on the mesh repo and offers deploy/redeploy. This writes the workflow + default prompt pack, commits, and pushes — reducing setup friction. The redeploy button is always visible on the hub. |
| D12 | Hub/Create/Manage pattern replaces linear wizard | The original 6-phase wizard was replaced with a hub-based pattern matching the Cheshire Cat: hub lists all review issues, create flow configures and submits, manage flow handles assign/monitor/results. This supports both creating new reviews and managing existing ones from the same panel. |
| D13 | Report rendered in results phase | When a review completes, the full report (Claude's findings comment) is rendered as markdown directly in the extension rather than requiring the user to open GitHub. The report finder looks for review markers (pillar headings, summary tables) to identify the substantive comment. |
| D14 | Review metrics stored in `app.yaml` | Findings are parsed from the summary table in the review report and appended to a `reviews:` section in `app.yaml`. Each record includes issue URL, date, agent, per-pillar finding counts, and a drift score. The BAR becomes dirty and goes through the existing git sync flow (Sync button → commit → push). No automatic PRs — the user controls when to sync. |
| D15 | Design Drift indicator on BAR detail | A score ring derived from the latest review's drift score appears between BAR info and composite score on the detail page. Green (≥75), yellow (≥50), red (<50). Click expands to show review history with issue links. Severity weights match section 6.2: critical −15, high −5, medium −2, low −1. |
| D16 | Multi-select with Default always included | Domain packs add depth to specific pillars. The Default pack provides the BAR artifact inventory and baseline 4-pillar analysis that every review needs. Making it non-removable ensures consistent baseline quality. Architects compose their review scope by checking additional domain packs. |
| D17 | YAML registry for prompt pack metadata | Avoids parsing `.md` frontmatter. The registry is version-controlled in the mesh, giving architects explicit control over which packs appear in the UI and in what order. Simple hand-rolled YAML parsing consistent with existing codebase patterns (`parseAppYaml`, `parseDecisions`). |
| D18 | Enhanced default prompt with full BAR inventory | The review agent needs to know exactly which artifacts exist in a BAR and what each file contains. Listing every file by path, format, and purpose — plus explaining the CALM 1.2 model structure — gives the agent maximum context. This is the single biggest driver of review quality. Previous default referenced wrong file extensions (`.json` instead of `.yaml`) and omitted key artifacts (ADRs, fitness functions, quality attributes, decisions). |