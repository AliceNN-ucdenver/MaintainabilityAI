# Governance Prompt Packs — Unified Design

> **Status**: Complete
> **Phase**: 8.x (from governance-reuse.md audit)
> **Goal**: Consolidate all prompt pack content, issue body templates, and pack services into a single `PromptPackService` with consistent patterns across Rabbit Hole and Looking Glass.

---

## 1. Problem Statement

### 1.1 Current State — Two Disconnected Systems

| Aspect | Rabbit Hole (Code Issues) | Looking Glass (Governance Reviews) |
|---|---|---|
| **Pack location** | `<ext>/prompt-packs/{owasp,maintainability,threat-modeling}/` | `<ext>/code-templates/prompts/oraculum-*.md` |
| **Runtime location** | Read from extension install dir | Seeded to `<mesh>/.caterpillar/prompts/` during init |
| **Service** | `PromptPackService` singleton | `ReviewService` (separate class, not a singleton) |
| **Registry** | `mappings.json` (CodeQL cross-refs) | `registry.yaml` (UI ordering + metadata) |
| **Editable by user?** | No — read-only browse command | Yes — plain files in mesh repo |
| **Issue builder** | `IssueBodyBuilder.ts` (inline string templates) | `ReviewService.buildIssueBody()` (inline string templates) |
| **Scaffold to repo?** | Only OWASP → `prompts/owasp/` (partial, no dot-folder) | N/A |
| **Issue references files?** | No — packs embedded only | Yes — `.caterpillar/prompts/{id}.md` paths listed |

### 1.2 Problems

1. **Naming confusion**: `code-templates/prompts/` contains governance mesh prompts, not code templates.
2. **Two services**: `PromptPackService` and `ReviewService` duplicate pack scanning, content loading, and collapsible section rendering.
3. **Inline string templates**: Both `IssueBodyBuilder.build()` (182 lines) and `ReviewService.buildIssueBody()` (115 lines) construct issue bodies as TypeScript string concatenation — hard to read, review, or customize.
4. **Scaffold only copies OWASP**: `ScaffoldPanel` copies 10 OWASP `.md` files to `prompts/owasp/` but ignores maintainability and threat-modeling packs.
5. **Rabbit Hole issues don't reference local files**: Oraculum issues say "read `.caterpillar/prompts/architecture.md`" giving agents a file path fallback. Rabbit Hole issues embed pack content but never tell the agent where the files live in the repo.
6. **No override pattern for Rabbit Hole**: Looking Glass packs can be customized in the mesh. Rabbit Hole packs are frozen in the extension install directory.

---

## 2. Design — Unified `PromptPackService`

### 2.1 Directory Layout

```
prompt-packs/
│
├── rabbit-hole/                      Code repo issue packs
│   ├── owasp/                        10 OWASP .md files (unchanged)
│   │   ├── A01_broken_access_control.md
│   │   ├── A02_crypto_failures.md
│   │   ├── A03_injection.md
│   │   ├── A04_insecure_design.md
│   │   ├── A05_security_misconfig.md
│   │   ├── A06_vuln_outdated.md
│   │   ├── A07_authn_failures.md
│   │   ├── A08_integrity_failures.md
│   │   ├── A09_logging_monitoring.md
│   │   └── A10_ssrf.md
│   ├── maintainability/              7 maintainability .md files (unchanged)
│   │   ├── complexity-reduction.md
│   │   ├── dependency-hygiene.md
│   │   ├── dry-principle.md
│   │   ├── fitness-functions.md
│   │   ├── single-responsibility.md
│   │   ├── strangler-fig.md
│   │   └── technical-debt.md
│   ├── threat-modeling/              6 STRIDE .md files (unchanged)
│   │   ├── denial-of-service.md
│   │   ├── elevation-of-privilege.md
│   │   ├── information-disclosure.md
│   │   ├── repudiation.md
│   │   ├── spoofing.md
│   │   └── tampering.md
│   ├── default.md                    Security-first baseline (always included)
│   ├── scaffold.md                   MOVED from code-templates/prompts/cheshire-scaffold-default.md
│   └── mappings.json                 CodeQL → OWASP cross-refs (unchanged)
│
├── looking-glass/                    Governance mesh review packs
│   ├── default.md                    MOVED from code-templates/prompts/oraculum-default.md
│   ├── architecture.md               MOVED from code-templates/prompts/oraculum-architecture.md
│   ├── application-security.md       MOVED from code-templates/prompts/oraculum-application-security.md
│   ├── information-risk.md           MOVED from code-templates/prompts/oraculum-information-risk.md
│   ├── operations.md                 MOVED from code-templates/prompts/oraculum-operations.md
│   └── registry.yaml                 MOVED from code-templates/prompts/oraculum-registry.yaml
│
└── templates/                        Issue body templates (extracted from TypeScript)
    ├── rabbit-hole-issue.md          EXTRACTED from IssueBodyBuilder.build()
    └── oraculum-issue.md             EXTRACTED from ReviewService.buildIssueBody()
```

**`code-templates/prompts/` is deleted entirely.** All 7 files move into `prompt-packs/`. The `code-templates/` directory retains only workflows and scripts (CI, CodeQL, fitness functions) — actual code scaffolding assets.

### 2.2 Pack Domains

| Domain | Source (bundled) | Categories | Override Location (in repo) |
|---|---|---|---|
| `rabbit-hole` | `prompt-packs/rabbit-hole/` | owasp, maintainability, threat-modeling, default, scaffold | `<codeRepo>/.cheshire/prompts/` |
| `looking-glass` | `prompt-packs/looking-glass/` | default, architecture, application-security, information-risk, operations | `<mesh>/.caterpillar/prompts/` |

**Convention**: Both domains use a Wonderland-character dot-folder in the target repo:
- `.cheshire/` = Cheshire Cat's framework folder in code repos
- `.caterpillar/` = Caterpillar's framework folder in the governance mesh

The dot-folder signals "framework metadata" and keeps prompt packs separate from user source code. Both are scaffolded by the extension and overridable by the user.

### 2.3 Override Resolution

Both domains follow the same pattern: **local repo copy wins → falls back to bundled**.

**Looking Glass** (existing pattern, formalized):

```
getEffectivePack('looking-glass', 'architecture')
  1. <meshPath>/.caterpillar/prompts/architecture.md  → exists? use it (user override)
  2. <extensionPath>/prompt-packs/looking-glass/architecture.md  → bundled fallback
  3. null
```

**Rabbit Hole** (new pattern — mirrors Looking Glass):

```
getEffectivePack('rabbit-hole', 'A03_injection')
  1. <codeRepoRoot>/.cheshire/prompts/owasp/A03_injection.md  → exists? use it (user override)
  2. <extensionPath>/prompt-packs/rabbit-hole/owasp/A03_injection.md  → bundled fallback
  3. null
```

This enables:
- User scaffolds a code repo with prompt packs → `.cheshire/prompts/owasp/`, `.cheshire/prompts/maintainability/`, `.cheshire/prompts/threat-modeling/` created
- User customizes `.cheshire/prompts/owasp/A03_injection.md` in their repo → override wins
- User doesn't scaffold packs → bundled version used
- Extension upgrade ships improved packs → user overrides untouched

### 2.4 Scaffold — All Categories

Currently `ScaffoldPanel` only copies OWASP. Expand to copy all three categories:

```typescript
// Before (ScaffoldPanel.ts line 310):
if (selectedIds.has('prompt-packs')) {
  const packsDir = path.join(this.context.extensionPath, 'prompt-packs', 'owasp');
  // only copies owasp/
}

// After — delegated to PromptPackService:
if (selectedIds.has('prompt-packs')) {
  const packFiles = promptPackService.getScaffoldFiles();
  for (const file of packFiles) {
    filesToCreate.push(file);
  }
}
```

`getScaffoldFiles()` returns:

```
.cheshire/prompts/owasp/A01_broken_access_control.md
.cheshire/prompts/owasp/A02_crypto_failures.md
...
.cheshire/prompts/maintainability/complexity-reduction.md
.cheshire/prompts/maintainability/dry-principle.md
...
.cheshire/prompts/threat-modeling/spoofing.md
.cheshire/prompts/threat-modeling/tampering.md
...
.cheshire/prompts/default.md
.cheshire/prompts/mappings.json
```

Scaffold checkbox updated — description **and** default state:
- Description: `'.cheshire/prompts/ — OWASP, maintainability, and STRIDE packs'`
- Default: `checked: true` (was `false` — prompt packs should be included by default since they're the foundation for agent-driven remediation)

---

## 3. Issue Templates

### 3.1 Template Engine

Simple `{{TOKEN}}` replacement. Tokens are uppercase with underscores. The template engine does **not** handle loops or conditionals — dynamic sections (collapsible pack groups, RCTRO requirements list, YAML lists) are rendered programmatically and injected as token values.

```typescript
private renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}
```

**Body truncation**: GitHub's issue body limit is 65,536 characters. Both issue builders enforce a `BODY_SAFE_LIMIT = 60_000` (leaving headroom). Per-pack content is capped at `MAX_PACK_CONTENT_CHARS = 8_000`. If the fully-rendered body exceeds the limit, it is truncated with a note. This logic lives in `buildRabbitHoleIssue()` and `buildOraculumIssue()`, not in the template engine itself.

### 3.2 Rabbit Hole Issue Template

**File**: `prompt-packs/templates/rabbit-hole-issue.md`

```markdown
## Feature: {{TITLE}}

**Created by**: MaintainabilityAI VS Code Extension
**Created**: {{TIMESTAMP}}
**Categories**: {{CATEGORIES}}

---

### RCTRO Prompt

{{RCTRO_BLOCK}}

---

{{PACK_FILE_REFS}}

{{PACK_SECTIONS}}

---

## Implementation Zone

**Option A — Assign to Claude** (2-phase: plan → approve → implement):

\`\`\`
@claude Please analyze this feature request and provide an implementation plan following the RCTRO prompt and security guidelines above.
\`\`\`

After reviewing the plan: \`@claude approved\`

**Option B — Assign to Copilot**: Assign this issue to Copilot. The RCTRO prompt above serves as the implementation spec.

---

{{METADATA}}
```

#### Token Values

| Token | Source | Example |
|---|---|---|
| `{{TITLE}}` | `request.title` | `Add payment processing endpoint` |
| `{{TIMESTAMP}}` | `new Date().toISOString()` | `2026-02-25T14:30:00.000Z` |
| `{{CATEGORIES}}` | Labels filtered by owasp/maintainability/stride | `owasp/A03_injection, stride/tampering` |
| `{{RCTRO_BLOCK}}` | `renderRctro(request.rctroPrompt)` | Rendered Role/Context/Task/Requirements/Output |
| `{{PACK_FILE_REFS}}` | `renderPackFileRefs('rabbit-hole', packIds)` | See §3.4 below |
| `{{PACK_SECTIONS}}` | `renderPackSections(packContents)` | Collapsible `<details>` HTML |
| `{{METADATA}}` | `renderMetadata(vars)` | Collapsible metadata block |

### 3.3 Oraculum Issue Template

**File**: `prompt-packs/templates/oraculum-issue.md`

```markdown
## Architecture Review Request

**Business Application:** {{APP_NAME}}
**Date:** {{DATE}}

## Review Configuration

\`\`\`oraculum
issue_number: ISSUE_NUMBER
bar_path: {{BAR_PATH}}
prompt_packs:
{{PACKS_YAML}}
scope:
{{PILLARS_YAML}}
repos:
{{REPOS_YAML}}
\`\`\`

## Review Directive

> **Architecture review**: Analyze code repositories against the BAR and produce review artifacts.

- **BAR** (at \`{{BAR_PATH}}/\`) = the documented expected architecture. Do not modify the BAR's architecture artifacts.
- **Code repos** (listed above) = the actual implementation. Analyze them against the BAR.
- **Direction**: Code → compared against → BAR. Report where code drifts from documentation.
- **Output**: Write a report to \`{{BAR_PATH}}/reports/review-ISSUE_NUMBER.md\`, update \`{{BAR_PATH}}/reviews.yaml\` with review metrics, and open a PR with \`Closes #ISSUE_NUMBER\`. Also post a brief summary comment on this issue.

{{CONTEXT_BLOCK}}

{{PACK_FILE_REFS}}

{{PACK_SECTIONS}}

---

## Implementation Zone

Both agents produce the same artifacts: a report file, updated \`reviews.yaml\` metrics, and a PR.

**Option A — Assign to Claude**: Post \`@claude\` as a comment to trigger the Oraculum workflow.

**Option B — Assign to Copilot**: Assign \`copilot-swe-agent\` to this issue.

### Expected Artifacts (both agents)

1. **Report file**: Write findings to \`{{BAR_PATH}}/reports/review-ISSUE_NUMBER.md\`
2. **Update reviews.yaml**: Append a review record to \`{{BAR_PATH}}/reviews.yaml\` with drift score and finding counts. **Do NOT modify app.yaml** — review history lives exclusively in \`reviews.yaml\`.
3. **Open a PR**: Branch \`fix/issue-ISSUE_NUMBER\`, title \`Oraculum Review: {{APP_NAME}} #ISSUE_NUMBER\`, body containing \`Closes #ISSUE_NUMBER\`
4. **Post a summary comment on this issue**: Post a comment with the summary table (pillar names, finding counts by severity) and the computed drift score.

---

{{METADATA}}
```

### 3.4 Pack File References — The Key Addition

Both issue templates now include `{{PACK_FILE_REFS}}` — a section that tells agents where to find the prompt pack files in the repo, independent of embedded content. This mirrors what Oraculum already does but extends it to Rabbit Hole.

**Rabbit Hole** `{{PACK_FILE_REFS}}` renders as:

```markdown
## Prompt Packs

Read the following prompt pack files for detailed implementation guidance:
- `.cheshire/prompts/owasp/A03_injection.md`
- `.cheshire/prompts/owasp/A07_authn_failures.md`
- `.cheshire/prompts/maintainability/complexity-reduction.md`
- `.cheshire/prompts/threat-modeling/tampering.md`

Each pack file is also embedded below for reference.
```

If the code repo was scaffolded without prompt packs (`.cheshire/prompts/` doesn't exist), this section is omitted and the embedded content in `{{PACK_SECTIONS}}` is the only source. The conditional check lives in `buildRabbitHoleIssue()`:

```typescript
// In buildRabbitHoleIssue():
const hasLocalPacks = this.codeRepoRoot
  && fs.existsSync(path.join(this.codeRepoRoot, '.cheshire', 'prompts'));
vars['PACK_FILE_REFS'] = hasLocalPacks
  ? this.renderPackFileRefs('rabbit-hole', packIds)
  : '';
```

**Looking Glass** `{{PACK_FILE_REFS}}` renders as (unchanged from current):

```markdown
## Prompt Packs

Read the following prompt pack files for detailed review instructions:
- `.caterpillar/prompts/default.md`
- `.caterpillar/prompts/architecture.md`
- `.caterpillar/prompts/application-security.md`

Each pack file is also embedded below for reference.
```

**Implementation**:

```typescript
private renderPackFileRefs(domain: PackDomain, packIds: string[]): string {
  const paths = packIds.map(id => {
    if (domain === 'looking-glass') {
      return `.caterpillar/prompts/${id}.md`;
    }
    // rabbit-hole: .cheshire/prompts/<category>/<id>.md
    const pack = this.findPack('rabbit-hole', id);
    if (!pack) return `.cheshire/prompts/${id}.md`;
    return `.cheshire/prompts/${pack.category}/${id}.md`;
  });

  const verb = domain === 'looking-glass' ? 'review instructions' : 'implementation guidance';

  return `## Prompt Packs\n\nRead the following prompt pack files for detailed ${verb}:\n`
    + paths.map(p => `- \`${p}\``).join('\n')
    + '\n\nEach pack file is also embedded below for reference.\n';
}
```

### 3.5 Collapsible Pack Sections

`{{PACK_SECTIONS}}` renders nested `<details>` HTML, grouped by category. This is shared rendering logic used by both issue templates.

```typescript
private renderPackSections(packs: PromptPackContent[]): string {
  const groups: { icon: string; title: string; innerIcon: string; category: string }[] = [
    { icon: '🛡️', title: 'Security-First Baseline (Always Included)', innerIcon: '📋', category: 'default' },
    { icon: '📘', title: 'OWASP Security Guidance', innerIcon: '🔒', category: 'owasp' },
    { icon: '🏗️', title: 'Maintainability Guidance', innerIcon: '📐', category: 'maintainability' },
    { icon: '🎯', title: 'Threat Model Analysis (STRIDE)', innerIcon: '🎭', category: 'threat-modeling' },
    { icon: '📘', title: 'Governance Review Pack', innerIcon: '📘', category: 'governance' },
  ];

  let html = '';
  for (const group of groups) {
    const groupPacks = packs.filter(p => p.category === group.category);
    if (groupPacks.length === 0) continue;

    html += `<details>\n<summary>${group.icon} <strong>${group.title}</strong> `
          + `(${groupPacks.length} ${groupPacks.length === 1 ? 'guide' : 'guides'})</summary>\n\n`;

    for (const pack of groupPacks) {
      let content = pack.content;
      if (content.length > MAX_PACK_CONTENT_CHARS) {
        content = content.slice(0, MAX_PACK_CONTENT_CHARS) + '\n\n*... (truncated)*';
      }
      html += `<details>\n<summary>${group.innerIcon} <strong>${pack.name}</strong></summary>\n\n`
            + content + '\n\n</details>\n\n';
    }

    html += '</details>\n\n';
  }
  return html;
}
```

### 3.6 RCTRO Block Rendering

RCTRO (Role/Context/Task/Requirements/Output) is the user-authored structured prompt in Rabbit Hole issues. It stays as a private render method — not a separate template file — because it's small (20 lines), only used in one place, and the Requirements section requires loop logic for the numbered list.

```typescript
private renderRctro(rctro: RctroPrompt): string {
  let md = `#### Role\n${rctro.role}\n\n`;
  md += `#### Context\n${rctro.context}\n\n`;
  md += `#### Task\n${rctro.task}\n\n`;
  md += `#### Requirements\n\n`;
  rctro.requirements.forEach((req, i) => {
    md += `${i + 1}. **${req.title}**\n`;
    for (const detail of req.details) {
      md += `   - ${detail}\n`;
    }
    md += `   - Validation: ${req.validation}\n\n`;
  });
  md += `#### Output\n${rctro.output}\n`;
  return md;
}
```

### 3.7 Metadata Block Rendering

Shared by both templates. Rendered as a collapsible `<details>` section.

```typescript
private renderMetadata(vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([k, v]) => `- **${k}**: ${v}`).join('\n');
  return `<details>\n<summary>📊 Additional Metadata</summary>\n\n${lines}\n\n</details>`;
}
```

**Rabbit Hole metadata**: Created, Extension Version, Repository, Labels, Tech Stack
**Oraculum metadata**: Created, Extension Version, Prompt Packs, Pillars

---

## 4. PromptPackService — Unified Interface

### 4.1 Complete API

```typescript
import { configService } from './ConfigService';   // needed by generateLabels()

type PackDomain = 'rabbit-hole' | 'looking-glass';

export class PromptPackService {
  private packsDir = '';                          // <extensionPath>/prompt-packs/
  private meshPath: string | null = null;         // set when Looking Glass opens a mesh
  private codeRepoRoot: string | null = null;     // set when a code repo workspace is open
  private templateCache = new Map<string, string>();
  private packCache = new Map<string, string>();
  private mappings: PromptMappings | null = null;
  private allPacksCache: Map<PackDomain, PromptPackInfo[]> = new Map();

  // ─── Initialization ──────────────────────────────────────
  initialize(extensionPath: string): void;        // called once from activate()
  setMeshPath(meshPath: string | null): void;     // called when Looking Glass opens/closes
  setCodeRepoRoot(root: string | null): void;     // called when workspace opens/closes

  // ─── Pack Discovery ──────────────────────────────────────
  getAllPacks(domain: PackDomain): PromptPackInfo[];
  getPacksByCategory(category: string): PromptPackInfo[];   // rabbit-hole convenience
  getPackContent(domain: PackDomain, packId: string): string | null;
  getSelectedPackContents(selection: PromptPackSelection): PromptPackContent[];
  getRelatedPacks(selection: PromptPackSelection): PromptPackSelection;
  getDefaultPackContent(): string;                // rabbit-hole default.md
  getScaffoldPackContent(): string;               // rabbit-hole scaffold.md
  getMappings(): PromptMappings;

  // ─── Override Resolution ─────────────────────────────────
  // Checks local repo/mesh first, falls back to bundled
  getEffectivePack(domain: PackDomain, packId: string):
    { content: string; source: 'local' | 'bundled' } | null;
  getEffectivePacks(domain: PackDomain, packIds: string[]):
    { name: string; content: string; source: 'local' | 'bundled' }[];

  // ─── Issue Body Builders ─────────────────────────────────
  buildRabbitHoleIssue(request: IssueCreationRequest): string;
  buildOraculumIssue(params: OraculumIssueParams): string;
  generateLabels(request: IssueCreationRequest): string[];  // uses configService.defaultLabels

  // ─── Repo Seeding ────────────────────────────────────────
  // Copy bundled packs → local repo. Skips files that already exist.
  seedMeshPrompts(meshPath: string): void;        // looking-glass → .caterpillar/prompts/
  getScaffoldFiles(): { relativePath: string; content: string }[];  // rabbit-hole → .cheshire/prompts/

  // ─── Private ─────────────────────────────────────────────
  private loadTemplate(name: string): string;
  private renderTemplate(template: string, vars: Record<string, string>): string;
  private renderRctro(rctro: RctroPrompt): string;
  private renderPackFileRefs(domain: PackDomain, packIds: string[]): string;
  private renderPackSections(packs: PromptPackContent[]): string;
  private renderMetadata(vars: Record<string, string>): string;
  private loadMappings(): PromptMappings;
  private loadFromRegistry(registryPath: string, promptsDir: string): PromptPackInfo[];
  private discoverCustomPacks(promptsDir: string, registeredIds: Set<string>): PromptPackInfo[];
  private findPack(domain: PackDomain, packId: string): PromptPackInfo | null;

  // ─── Local Path Resolution ───────────────────────────────
  private getLocalPackPath(domain: PackDomain, packId: string): string | null;
  //  looking-glass: <meshPath>/.caterpillar/prompts/<packId>.md
  //  rabbit-hole:   <codeRepoRoot>/.cheshire/prompts/<category>/<packId>.md
  private getBundledPackPath(domain: PackDomain, packId: string): string;
  //  looking-glass: <packsDir>/looking-glass/<packId>.md
  //  rabbit-hole:   <packsDir>/rabbit-hole/<category>/<packId>.md
}

export const promptPackService = new PromptPackService();
```

### 4.2 OraculumIssueParams Type

```typescript
export interface OraculumIssueParams {
  appName: string;
  barPath: string;
  scope: ReviewScope;
  additionalContext?: string;
}
```

### 4.3 Type Reconciliation — `PromptPackInfo`

The codebase currently has **two** `PromptPackInfo` interfaces with different shapes:

| Field | `types/prompts.ts` (Rabbit Hole) | `ReviewService.ts` (Looking Glass) |
|---|---|---|
| `id` | `string` | `string` |
| `category` | `'owasp' \| 'maintainability' \| 'threat-modeling'` | — |
| `name` | `string` | `string` |
| `filename` | `string` | — |
| `description` | — | `string` |
| `domain` | — | `string?` |
| `required` | — | `boolean?` |
| `available` | — | `boolean` |
| `content` | `string?` | — |

The unified type in `types/prompts.ts` expands to serve both domains:

```typescript
export interface PromptPackInfo {
  id: string;
  name: string;
  filename: string;
  // Domain-aware fields
  packDomain: PackDomain;                                            // 'rabbit-hole' | 'looking-glass'
  category?: 'owasp' | 'maintainability' | 'threat-modeling' | 'governance';  // rabbit-hole uses categories; looking-glass packs get 'governance'
  // Looking Glass fields (optional for rabbit-hole)
  description?: string;          // UI description (always set for looking-glass, derived for rabbit-hole)
  required?: boolean;            // true for looking-glass 'default' pack
  available?: boolean;           // true if the .md file exists on disk
  // Content (loaded on demand)
  content?: string;
}
```

The `ReviewService`'s local `PromptPackInfo` export is deleted — all consumers import from `types/prompts.ts`. The `OracularPanel` already imports types from `../types`, so this is a clean swap.

### 4.4 Override Resolution — Both Domains

```
getEffectivePack(domain, packId)
  │
  ├─ domain === 'looking-glass'
  │    ├─ meshPath set?
  │    │    ├─ YES → <meshPath>/.caterpillar/prompts/<packId>.md exists? → use it
  │    │    └─ NO  → fall through
  │    └─ <packsDir>/looking-glass/<packId>.md → bundled fallback
  │
  └─ domain === 'rabbit-hole'
       ├─ codeRepoRoot set?
       │    ├─ YES → <codeRepoRoot>/.cheshire/prompts/<category>/<packId>.md exists? → use it
       │    └─ NO  → fall through
       └─ <packsDir>/rabbit-hole/<category>/<packId>.md → bundled fallback
```

**Seeding**: Both domains write only if the target file doesn't already exist, preserving user customizations:

| Domain | Seed method | Source | Target |
|---|---|---|---|
| Looking Glass | `seedMeshPrompts(meshPath)` | `prompt-packs/looking-glass/*.md` + `registry.yaml` | `<meshPath>/.caterpillar/prompts/` |
| Rabbit Hole | `getScaffoldFiles()` | `prompt-packs/rabbit-hole/{owasp,maintainability,threat-modeling}/*.md` + `default.md` + `mappings.json` | `.cheshire/prompts/` in scaffolded repo |

---

## 5. Consumer Changes

### 5.1 GitHubService (Rabbit Hole Issue Creation)

```typescript
// Before:
import { IssueBodyBuilder } from './IssueBodyBuilder';
private bodyBuilder = new IssueBodyBuilder();
const body = this.bodyBuilder.build(request);
const labels = this.bodyBuilder.generateLabels(request);

// After:
import { promptPackService } from './PromptPackService';
const body = promptPackService.buildRabbitHoleIssue(request);
const labels = promptPackService.generateLabels(request);
```

### 5.2 OracularPanel (Looking Glass Review Creation)

```typescript
// Before:
import { ReviewService } from '../services/ReviewService';
this.reviewService = new ReviewService();
const packs = this.reviewService.loadPromptPacks(meshPath);
const promptPacks = this.reviewService.loadMultiplePromptPacks(meshPath, packIds);
const body = this.reviewService.buildIssueBody(appName, barPath, scope, ctx, promptPacks);

// After:
import { promptPackService } from '../services/PromptPackService';
const packs = promptPackService.getAllPacks('looking-glass');
const body = promptPackService.buildOraculumIssue({ appName, barPath, scope, additionalContext });
```

### 5.3 LookingGlassPanel — Mesh Init (2 call sites)

`writeOraculumWorkflow()` is called at **two** sites in `LookingGlassPanel.ts`:
- **Line 605** — during `onInitMesh()` (first mesh creation)
- **Line 2621** — during `handleSetupOraculum()` (manual setup from BAR detail)

Both sites get the same treatment:

```typescript
// Before (at both line 605 and 2621):
this.meshService.writeOraculumWorkflow(meshPath, this.context.extensionPath);
// writeOraculumWorkflow internally writes: workflow YAML + prompt packs + registry

// After (at both sites):
promptPackService.seedMeshPrompts(meshPath);           // prompt packs + registry
this.meshService.writeOraculumWorkflow(meshPath, this.context.extensionPath);  // workflow YAML only
```

`seedMeshPrompts()` is idempotent (skips existing files), so calling it at both sites is safe.

### 5.4 LookingGlassPanel — Scaffold from BAR

```typescript
// Before:
import { generateScaffoldPromptPack } from '../templates/codeRepoTemplates';
const packContent = generateScaffoldPromptPack(this.context.extensionPath);

// After:
const packContent = promptPackService.getScaffoldPackContent();
```

### 5.5 ScaffoldPanel — Scaffold Prompt Packs to Code Repo

```typescript
// Before (only copies OWASP to prompts/):
if (selectedIds.has('prompt-packs')) {
  const packsDir = path.join(this.context.extensionPath, 'prompt-packs', 'owasp');
  if (fs.existsSync(packsDir)) {
    const files = fs.readdirSync(packsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(packsDir, file), 'utf8');
      filesToCreate.push({ relativePath: `prompts/owasp/${file}`, content });
    }
  }
}

// After (all categories to .cheshire/prompts/ via service):
if (selectedIds.has('prompt-packs')) {
  filesToCreate.push(...promptPackService.getScaffoldFiles());
}
```

Scaffold checkbox updated:
```typescript
// Before:
{ id: 'prompt-packs', label: 'Prompt Packs', desc: 'prompts/owasp/ — 10 OWASP packs', checked: false }

// After:
{ id: 'prompt-packs', label: 'Prompt Packs', desc: '.cheshire/prompts/ — OWASP, maintainability, and STRIDE packs', checked: true }
```

### 5.6 browsePromptPacks Command — No Change

Already uses `promptPackService`. No changes needed.

### 5.7 ScorecardPanel — No Change

Uses `promptPackService` for remediation workflows. No changes needed.

### 5.8 extension.ts — Minor Addition

```typescript
// Before:
promptPackService.initialize(context.extensionPath);

// After:
promptPackService.initialize(context.extensionPath);
// setMeshPath/setCodeRepoRoot called by panels when they open
```

---

## 6. Deletions

### 6.1 Files Deleted

| File | Lines | Reason |
|---|---|---|
| `src/services/IssueBodyBuilder.ts` | 182 | Logic moves to `PromptPackService.buildRabbitHoleIssue()` + template |
| `src/services/ReviewService.ts` | 304 | All methods absorbed by `PromptPackService`; `hasReviewFindings()` moves to `GitHubService` |
| `code-templates/prompts/oraculum-default.md` | — | Moved to `prompt-packs/looking-glass/default.md` |
| `code-templates/prompts/oraculum-architecture.md` | — | Moved to `prompt-packs/looking-glass/architecture.md` |
| `code-templates/prompts/oraculum-application-security.md` | — | Moved to `prompt-packs/looking-glass/application-security.md` |
| `code-templates/prompts/oraculum-information-risk.md` | — | Moved to `prompt-packs/looking-glass/information-risk.md` |
| `code-templates/prompts/oraculum-operations.md` | — | Moved to `prompt-packs/looking-glass/operations.md` |
| `code-templates/prompts/oraculum-registry.yaml` | — | Moved to `prompt-packs/looking-glass/registry.yaml` |
| `code-templates/prompts/cheshire-scaffold-default.md` | — | Moved to `prompt-packs/rabbit-hole/scaffold.md` |
| `code-templates/prompts/` directory | — | Empty after moves, delete |

### 6.2 Functions Deleted from `codeRepoTemplates.ts`

| Function | Lines | Reason |
|---|---|---|
| `generateOraculumDefaultPrompt()` | 3 | Service reads directly from `prompt-packs/looking-glass/` |
| `generateOraculumPromptPack()` | 3 | Service reads directly |
| `generateScaffoldPromptPack()` | 3 | `promptPackService.getScaffoldPackContent()` |
| `generateOraculumRegistry()` | 2 | Service reads directly |

### 6.3 Code Removed from `MeshService.ts`

The prompt-writing block in `writeOraculumWorkflow()` (~35 lines that write `default.md`, `registry.yaml`, and 4 domain packs) is replaced by `promptPackService.seedMeshPrompts(meshPath)`. The workflow YAML write stays in `MeshService`.

### 6.4 `ReviewService.hasReviewFindings()` → `GitHubService`

The only surviving method from `ReviewService` — moves to `GitHubService` as a static helper since it operates on `IssueComment[]` which is already a GitHub type.

---

## 7. Design Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | Single `PromptPackService` singleton for both domains | Eliminates `ReviewService` duplication; one place for pack scanning, override resolution, template rendering |
| D2 | `{{TOKEN}}` replacement (not Mustache/Handlebars) | No external dependency; templates are simple enough; loops handled programmatically |
| D3 | RCTRO stays as render method, not a template file | Only used in one place; 20 lines; Requirements needs loop logic |
| D4 | Collapsible `<details>` sections stay programmatic | Dynamic pack count requires loop; grouped by category; shared between both issue types |
| D5 | Pack file references added to Rabbit Hole issues | Mirrors Oraculum pattern; agents can read full files from repo, not just truncated embedded content |
| D6 | Scaffold expanded to all 3 categories | No reason to only scaffold OWASP; maintainability and STRIDE packs are equally useful for agent-driven development |
| D7 | Override resolution: local file → bundled fallback | Consistent pattern for both domains; user customizations survive extension upgrades |
| D8 | `code-templates/prompts/` eliminated entirely | All prompt content belongs in `prompt-packs/`; `code-templates/` retains only workflow/script assets |
| D9 | `scaffold.md` lives in `rabbit-hole/` not `looking-glass/` | It's used when creating code repo issues from BAR components — the issue goes to a code repo, so it's a rabbit-hole pack |
| D10 | Code repo packs scaffold to `.cheshire/prompts/` (dot-folder) | Mirrors `.caterpillar/prompts/` in the mesh. Dot-folder signals framework metadata, keeps packs separate from user source. `.cheshire/` can grow to hold future config (agent prefs, tech stack overrides). Wonderland naming: Cheshire Cat owns the code repo, Caterpillar owns the mesh. |

---

## 8. Implementation Phases

### Phase 1: Move Files + Create Templates ✅
- [x] Create `prompt-packs/rabbit-hole/` subdirectory
- [x] `git mv prompt-packs/owasp/ prompt-packs/rabbit-hole/owasp/`
- [x] `git mv prompt-packs/maintainability/ prompt-packs/rabbit-hole/maintainability/`
- [x] `git mv prompt-packs/threat-modeling/ prompt-packs/rabbit-hole/threat-modeling/`
- [x] `git mv prompt-packs/default.md prompt-packs/rabbit-hole/default.md`
- [x] `git mv prompt-packs/mappings.json prompt-packs/rabbit-hole/mappings.json`
- [x] Create `prompt-packs/looking-glass/` subdirectory
- [x] `git mv` all 7 `code-templates/prompts/` files to `prompt-packs/looking-glass/` (strip `oraculum-` prefix)
- [x] `git mv code-templates/prompts/cheshire-scaffold-default.md prompt-packs/rabbit-hole/scaffold.md`
- [x] Delete `code-templates/prompts/` directory
- [x] Create `prompt-packs/templates/rabbit-hole-issue.md` (extracted from `IssueBodyBuilder`)
- [x] Create `prompt-packs/templates/oraculum-issue.md` (extracted from `ReviewService`)
- [x] `.vscodeignore` — no change needed

### Phase 2: Expand PromptPackService ✅
- [x] Expand `PromptPackInfo` in `types/prompts.ts` — add `packDomain`, `description`, `required`, `available` fields; widen `category` union to include `'governance'` (see §4.3)
- [x] Add `PackDomain` type export to `types/prompts.ts`
- [x] Delete local `PromptPackInfo` interface from `ReviewService.ts` (consumers switch to `types/prompts.ts`)
- [x] Add `meshPath`, `codeRepoRoot`, `templateCache` fields to service
- [x] Add `setMeshPath()`, `setCodeRepoRoot()` methods
- [x] Add `getEffectivePack()` / `getEffectivePacks()` with override resolution
- [x] Move registry scanning from `ReviewService` (`loadFromRegistry`, `discoverCustomPacks`, `loadFromFiles`)
- [x] Add `loadTemplate()` and `renderTemplate()` private methods
- [x] Add `renderPackFileRefs()` — the new shared pack file reference renderer
- [x] Add `renderPackSections()` — shared collapsible `<details>` renderer
- [x] Add `renderRctro()` — moved from `IssueBodyBuilder`
- [x] Add `renderMetadata()` — shared metadata block renderer
- [x] Add `getScaffoldPackContent()` — reads `rabbit-hole/scaffold.md`
- [x] Add `getScaffoldFiles()` — returns all rabbit-hole packs for code repo scaffolding
- [x] Add `seedMeshPrompts(meshPath, force?)` — copies looking-glass packs to mesh `.caterpillar/prompts/` (force=true overwrites existing)

### Phase 3: Issue Builders on Service ✅
- [x] Add `buildRabbitHoleIssue()` — loads template, renders tokens, handles truncation
- [x] Add `buildOraculumIssue()` — loads template, renders tokens
- [x] Add `generateLabels()` — moved from `IssueBodyBuilder`
- [x] `hasReviewFindings()` — was defined but never called; deleted with `ReviewService.ts`

### Phase 4: Update Consumers ✅
- [x] `GitHubService` — use `promptPackService` instead of `IssueBodyBuilder`
- [x] `OracularPanel` — use `promptPackService` instead of `ReviewService`
- [x] `LookingGlassPanel` mesh init — `promptPackService.seedMeshPrompts()` + slimmed `writeOraculumWorkflow()` (both call sites: line 605 + 2622)
- [x] `LookingGlassPanel` scaffold from BAR — `promptPackService.getScaffoldPackContent()`
- [x] `ScaffoldPanel` — `promptPackService.getScaffoldFiles()`, checkbox `checked: true`, desc updated to include all 3 categories
- [x] `MeshService.writeOraculumWorkflow()` — removed prompt-writing block, keeps workflow YAML only
- [x] `codeRepoTemplates.ts` — deleted 4 oraculum/scaffold wrapper functions

### Phase 5: Delete Dead Code ✅
- [x] Delete `src/services/IssueBodyBuilder.ts` (182 lines)
- [x] Delete `src/services/ReviewService.ts` (304 lines)
- [x] Verified no remaining imports reference deleted files

### Phase 6: Build + Verify ✅
- [x] `node esbuild.js --production` — clean build
- [x] `npx tsc --noEmit` — clean type check (fixed `types/webview.ts` `promptPacksLoaded` to use unified `PromptPackInfo[]`)
- [ ] F5 launch → Rabbit Hole: create issue with OWASP packs → verify pack file refs + collapsible content
- [ ] F5 launch → Looking Glass: create Oraculum review → verify pack file refs + collapsible content
- [ ] F5 launch → Looking Glass: init mesh → verify packs seeded to `.caterpillar/prompts/`
- [ ] F5 launch → Looking Glass: Settings → Refresh Prompts → verify force-reseed
- [ ] F5 launch → Scaffold: scaffold with prompt packs → verify all 3 categories copied
- [ ] F5 launch → Scaffold: scaffold without prompt packs → verify Rabbit Hole issue still works (bundled fallback)
- [ ] Edit a mesh pack → verify override is used in next review issue
- [ ] Browse prompt packs command → verify still works

### Post-Implementation Enhancements
- [x] **Refresh Prompts** — Settings button in Looking Glass to force-reseed `.caterpillar/prompts/` without reinitializing mesh (`seedMeshPrompts(meshPath, true)`)
- [x] **Git sync banner — uncommitted changes** — Banner now shows dirty file count with "Commit All" button (stacks with ahead/behind banners)

---

## 9. File Reference Summary

### Files Created
- `prompt-packs/rabbit-hole/scaffold.md`
- `prompt-packs/templates/rabbit-hole-issue.md`
- `prompt-packs/templates/oraculum-issue.md`

### Files Moved (git mv)
- `code-templates/prompts/oraculum-default.md` → `prompt-packs/looking-glass/default.md`
- `code-templates/prompts/oraculum-architecture.md` → `prompt-packs/looking-glass/architecture.md`
- `code-templates/prompts/oraculum-application-security.md` → `prompt-packs/looking-glass/application-security.md`
- `code-templates/prompts/oraculum-information-risk.md` → `prompt-packs/looking-glass/information-risk.md`
- `code-templates/prompts/oraculum-operations.md` → `prompt-packs/looking-glass/operations.md`
- `code-templates/prompts/oraculum-registry.yaml` → `prompt-packs/looking-glass/registry.yaml`
- `code-templates/prompts/cheshire-scaffold-default.md` → `prompt-packs/rabbit-hole/scaffold.md`
- `prompt-packs/owasp/` → `prompt-packs/rabbit-hole/owasp/`
- `prompt-packs/maintainability/` → `prompt-packs/rabbit-hole/maintainability/`
- `prompt-packs/threat-modeling/` → `prompt-packs/rabbit-hole/threat-modeling/`
- `prompt-packs/default.md` → `prompt-packs/rabbit-hole/default.md`
- `prompt-packs/mappings.json` → `prompt-packs/rabbit-hole/mappings.json`

### Files Deleted
- `src/services/IssueBodyBuilder.ts`
- `src/services/ReviewService.ts`
- `code-templates/prompts/` (entire directory)

### Files Modified
- `src/services/PromptPackService.ts` (major expansion)
- `src/services/GitHubService.ts` (use service, add `hasReviewFindings`)
- `src/services/MeshService.ts` (remove prompt-writing from `writeOraculumWorkflow`)
- `src/templates/codeRepoTemplates.ts` (delete 4 wrapper functions)
- `src/types/prompts.ts` (expand `PromptPackInfo` to unified type, add `PackDomain`, see §4.3)
- `src/webview/OracularPanel.ts` (use service instead of ReviewService)
- `src/webview/LookingGlassPanel.ts` (use service for scaffold + mesh init at both call sites)
- `src/webview/ScaffoldPanel.ts` (use service for scaffold files, update label)
- `src/types/webview.ts` (updated `promptPacksLoaded` to use unified `PromptPackInfo[]`, added `commitMesh` + `refreshPromptPacks` message types)
- `src/webview/app/views/barDetail.ts` (git sync banner shows uncommitted changes + Commit All button)
- `src/extension.ts` (no change — already initializes service)
