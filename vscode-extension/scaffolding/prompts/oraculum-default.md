# Oraculum Architecture Review — Default Prompt Pack

You are performing a **governance architecture review** for a business application. Your job is to compare the **code repositories** (actual implementation) against the **BAR artifacts** (documented expected architecture) and identify drift, gaps, and risks across four governance pillars: Architecture, Security, Information Risk, and Operations.

**Direction**: Code repos = actual state. BAR = expected state. You are checking whether the code matches what the BAR documents — not the other way around.

---

## Workspace Layout

The review workspace is organized as follows:

- **BAR artifacts**: Located at the `bar_path` specified in the issue configuration. The BAR (Business Application Record) is the documented "expected state" of the application.
- **Code repositories**: Located in the `repos/` directory. Each subdirectory is a shallow-cloned component repository — the "actual state" of the application.
- **Prompt packs**: Located in `.caterpillar/prompts/` — you are reading one now.

---

## BAR Artifact Inventory

Read and use ALL available artifacts below as your baseline. Not every BAR will have every file — adapt your analysis to what exists.

### Root Manifest

| File | Description |
|------|-------------|
| `app.yaml` | Application metadata — ID, name, portfolio, platform, criticality (critical/high/medium/low), lifecycle stage (build/run/sunset/decommission), rationalization strategy (reassess/extract/advance/prune), owner, and component repository index (`repos:` list). |
| `reviews.yaml` | Review history — Oraculum review records with issue URLs, agents, drift scores, and per-pillar finding counts. Created/updated by review agents. |

### Architecture Pillar (`architecture/`)

| File | Description |
|------|-------------|
| `bar.arch.json` | **CALM 1.2 architecture model** — the canonical machine-readable architecture. Contains `nodes` (actors, systems, services, databases, networks), `relationships` (connects, interacts, composed-of), `flows` (ordered sequences of relationship transitions), and `controls` (security requirements attached to relationships). |
| `decorator.json` | CALM decorator mappings — associates nodes with business capabilities and BTABoK quality characteristics. |
| `ADRs/*.md` | **Architecture Decision Records** — numbered documents (ADR-001, ADR-002, etc.) recording architectural decisions with Status, Context, Decision, and Consequences sections. Decisions here should be reflected in the code. |
| `fitness-functions.yaml` | Automated quality gates — defines thresholds for cyclomatic complexity, test coverage, dependency freshness, performance budgets, and security compliance. Code should meet these thresholds. |
| `quality-attributes.yaml` | Non-functional requirement definitions — availability targets, latency budgets, throughput expectations, and scalability requirements. Code should implement patterns that achieve these targets. |

### Security Pillar (`security/`)

| File | Description |
|------|-------------|
| `threat-model.yaml` | STRIDE-based threat model — documents threats, affected components, existing controls, risk ratings, and mitigation status. |
| `security-controls.yaml` | Implemented security controls — maps controls to threats and components. Verify these controls exist in code. |
| `vulnerability-tracking.yaml` | Known vulnerabilities — tracks identified issues, severity, status, and remediation plans. |
| `compliance-checklist.yaml` | Regulatory and standard compliance — tracks adherence to SOC2, PCI-DSS, HIPAA, or other frameworks. |

### Information Risk Pillar (`information-risk/`)

| File | Description |
|------|-------------|
| `ira.md` | Information Risk Assessment — narrative document describing the application's risk posture. |
| `data-classification.yaml` | Data categories with sensitivity levels — defines what data the application handles and at what classification (public, internal, confidential, restricted). |
| `vism.yaml` | Vendor/Integration Security Mapping — third-party services and APIs the application depends on, with security assessment status. |
| `privacy-impact.yaml` | Privacy Impact Assessment — PII handling, GDPR/CCPA considerations, data subject rights support. |

### Operations Pillar (`operations/`)

| File | Description |
|------|-------------|
| `runbook.md` | Application runbook — operational procedures for deployment, scaling, troubleshooting, and incident response. |
| `service-mapping.yaml` | Service dependency map — documents upstream/downstream dependencies, health endpoints, and circuit breaker configurations. |
| `sla-definitions.yaml` | SLA targets — availability percentages, latency budgets (p50/p95/p99), error rate thresholds, and escalation policies. |
| `incident-response.yaml` | Incident response playbook — severity classifications, on-call procedures, communication templates, and post-mortem requirements. |

### Governance (`governance/`)

| File | Description |
|------|-------------|
| `decisions.yaml` | Governance decisions — pending, approved, and rejected decisions about the application's direction, technology choices, and risk acceptance. |

---

## CALM Architecture Model Reference

If `bar.arch.json` exists, it follows the **CALM 1.2 (Common Architecture Language Model)** specification:

- **Nodes** represent architectural elements:
  - `actor` — external users or systems that interact with the application
  - `system` — bounded systems or containers (may be nested via composed-of)
  - `service` — individual services or microservices within a system
  - `database` / `datastore` — persistent data stores
  - `network` — network boundaries or zones

- **Relationships** define how nodes connect:
  - `connects` — a technical connection between two nodes (e.g., service A calls service B via REST)
  - `interacts` — an actor interacts with a system (e.g., user accesses the web portal)
  - `composed-of` — containment hierarchy (e.g., system X contains services A, B, C)

- **Flows** define ordered sequences of interactions (e.g., "Claim Submission Flow" traverses relationships R1 → R2 → R3 in order).

- **Controls** attach security requirements to specific relationships (e.g., "TLS 1.3 required" on an external-facing connection).

When comparing against code: every `service` node should have a corresponding codebase or module, every `connects` relationship should have a matching integration (API call, message queue, database connection), and the protocols specified (REST, gRPC, AMQP) should match what the code actually uses.

---

## Review Instructions

### Step 1: Read BAR Artifacts

Read all available BAR artifacts listed above. Build a mental model of the documented architecture — what components exist, how they connect, what security controls are in place, what data they handle, and how they're operated.

### Step 2: Analyze Each Code Repository

For each code repository in `repos/`, analyze:
- **Project structure** — source directories, configuration files, dependency manifests
- **Service/component boundaries** — classes, modules, packages, and their responsibilities
- **Integration points** — API clients, message producers/consumers, database connections, external service calls
- **Technology choices** — frameworks, libraries, protocols, languages
- **Security patterns** — authentication, authorization, input validation, encryption
- **Data handling** — what data is read, written, stored, transmitted
- **Operational instrumentation** — logging, metrics, tracing, health checks

### Step 3: Compare and Report

Compare the documented state (BAR) against the actual state (code) and report findings across all four pillars.

---

## Architecture Analysis

- Compare containers and services in code against CALM nodes in `bar.arch.json`
- Identify **undocumented components**: code exists but not in CALM diagram
- Identify **phantom components**: in CALM diagram but no corresponding code
- Verify integration protocols match documented relationships (e.g., CALM says gRPC but code uses REST)
- Check for dependency chains not reflected in the architecture
- Verify composed-of relationships match actual service groupings
- Check ADR compliance — are decisions in `ADRs/` being followed in code?
- Validate fitness function thresholds against actual code metrics where measurable

## Security Analysis

- Compare authentication and authorization patterns against the threat model
- Identify data flows that cross trust boundaries without documented controls
- Check dependency manifests (`package.json`, `pom.xml`, `requirements.txt`, `go.mod`) for known vulnerability patterns
- Verify secrets management patterns (no hardcoded credentials, proper vault/env usage)
- Look for OWASP Top 10 patterns: injection, broken auth, sensitive data exposure
- Verify security controls in `security-controls.yaml` are implemented in code

## Information Risk Analysis

- Trace data handling in code against `data-classification.yaml`
- Identify PII or sensitive data processing in components not flagged for it
- Check for third-party API calls not documented in `vism.yaml`
- Verify encryption patterns for data at rest and in transit
- Check for data residency or retention concerns
- Compare privacy handling against `privacy-impact.yaml`

## Operations Analysis

- Compare service startup and health check implementations against the runbook
- Verify service-to-service dependencies match `service-mapping.yaml`
- Check for observability instrumentation (logging, metrics, tracing)
- Identify configuration management patterns and environment handling
- Look for resilience patterns (circuit breakers, retries, fallbacks)
- Compare SLA-critical paths against `sla-definitions.yaml` targets

---

## Output Artifacts

After completing the analysis, produce the following artifacts:

### 1. Report File

Write a report file to `{bar_path}/reports/review-{issue_number}.md` with the following structure:

```markdown
## Oraculum Review: [Application Name]

### Summary
| Pillar | Findings | Critical | High | Medium | Low |
|--------|----------|----------|------|--------|-----|
| Architecture | X | X | X | X | X |
| Security | X | X | X | X | X |
| Information Risk | X | X | X | X | X |
| Operations | X | X | X | X | X |

### Architecture Findings

**[SEVERITY] Finding title**
- Location: `repos/repo-name/path/to/file.ts:42`
- Expected: What the BAR documents
- Actual: What the code shows
- Action: Recommended remediation

### Security Findings
(same format)

### Information Risk Findings
(same format)

### Operations Findings
(same format)
```

### 2. Update `reviews.yaml`

Append a review record to `{bar_path}/reviews.yaml`. If the file does not exist, create it with a `reviews:` root key:

```yaml
# Oraculum Review History
reviews:
  - issue_url: "https://github.com/{owner}/{repo}/issues/{N}"
    issue_number: {N}
    date: "YYYY-MM-DD"
    agent: claude  # or copilot
    drift_score: {score}
    pillars:
      architecture:
        findings: X
        critical: X
        high: X
        medium: X
        low: X
      security:
        findings: X
        critical: X
        high: X
        medium: X
        low: X
      information-risk:
        findings: X
        critical: X
        high: X
        medium: X
        low: X
      operations:
        findings: X
        critical: X
        high: X
        medium: X
        low: X
```

**Drift score formula**: `100 - (critical * 15 + high * 5 + medium * 2 + low * 1)` (minimum 0).

> **Important**: Write review records to `reviews.yaml` ONLY. Do NOT add a `reviews:` section to `app.yaml` — review history is stored exclusively in `reviews.yaml`.

### 3. Create a Branch and Commit

Create a branch, commit the artifacts, and push:

```bash
git checkout -b fix/issue-{N}
git add {bar_path}/
git commit -m "Oraculum Review: {app_name} #{N}"
git push origin fix/issue-{N}
```

### 4. Open a Pull Request

If you have access to the `gh` CLI, create the PR:

```bash
gh pr create --title "Oraculum Review: {app_name} #{N}" --body "Closes #{N}"
```

> **Note**: When running via the Oraculum GitHub Action workflow, the PR and summary comment are created automatically by subsequent workflow steps. You only need to push the branch.

### 5. Post a Summary Comment

Post a brief comment on the issue:

```bash
gh issue comment {N} --body "## Review Summary ..."
```

---

## Severity Criteria

- **Critical**: Active security vulnerability, major architectural violation that could cause outage or data breach
- **High**: Significant drift that impacts reliability, security posture, or operational capability
- **Medium**: Moderate drift or gap that should be addressed in the next planning cycle
- **Low**: Minor inconsistency or documentation gap, informational
