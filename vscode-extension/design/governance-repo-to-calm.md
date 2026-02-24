# Absolem Feature: Repo-to-CALM Patch

> *"Who are you?" said the Caterpillar — but this time, it already knows.*

Absolem scans an existing GitHub repository and proposes incremental CALM architecture patches based on what it finds in the code. Not a full replacement — a **patch** that adds what's missing to the BAR's existing architecture.

---

## The Problem

Today, CALM architectures are built top-down: you design nodes, relationships, and interfaces by hand in the Looking Glass. But most teams already have running code. They need to go **bottom-up** — derive architecture from reality, then govern it.

Currently there's no way to say: *"Here's my repo — tell me what my architecture actually looks like and update CALM to match."*

---

## The Feature

### User Flow

1. User is on a BAR detail view in the Looking Glass
2. Clicks the Absolem FAB → chat overlay opens
3. Selects the **"Scan Repo"** command chip (new, 8th command)
4. Absolem asks: *"Paste a GitHub repository URL and I'll analyze the codebase to propose architecture patches."*
5. User pastes a repo URL (e.g. `https://github.com/org/movie-api`)
6. Absolem scans the repo via GitHub MCP tools (file tree, key files, source structure)
7. Absolem compares what it found against the BAR's existing CALM architecture
8. Absolem streams a response with:
   - Summary of what it found (services, databases, APIs, frameworks)
   - What's already in CALM (matched nodes)
   - What's missing (proposed new nodes + relationships)
   - A `calm-patches` code fence with incremental patches
9. User reviews patches in the familiar patches card (accept / reject / open in editor)
10. Accepted patches merge into the BAR's CALM JSON

### Why Patch, Not Replace

The BAR may already have hand-curated architecture: carefully named nodes, manually added controls, custom relationships, container hierarchies. A full replacement would destroy that work. Patches:

- **Add** new nodes the repo reveals (e.g. a Redis cache not yet in CALM)
- **Add** new relationships (e.g. the API calls a 3rd-party service)
- **Update** metadata on existing nodes (e.g. add detected tech stack, ports)
- **Never remove** existing nodes — the human decides what to deprecate

---

## Technical Design

### New Command: `repo-to-calm`

#### 1. Type Definition

```typescript
// src/types/index.ts — extend AbsolemCommand
export type AbsolemCommand =
  | 'drift-analysis'
  | 'add-components'
  | 'validate'
  | 'freeform'
  | 'gap-analysis'
  | 'suggest-adr'
  | 'image-to-calm'
  | 'repo-to-calm';     // NEW
```

#### 2. Command Chip (webview)

```typescript
// src/webview/app/lookingGlass.ts — in renderAbsolemFloating()
// Add to the chips array:
{ command: 'repo-to-calm', label: 'Scan Repo', icon: '🔍' }
```

#### 3. Absolem Flow — Two-Phase Interaction

Unlike other commands that start immediately, `repo-to-calm` requires user input (the repo URL) before scanning begins. This follows the same pattern as `freeform` — Absolem posts a greeting and waits.

**Phase A: Prompt for URL**

When `repo-to-calm` is selected, Absolem responds with:

> Paste a GitHub repository URL and I'll analyze the codebase to propose CALM architecture patches.
>
> I'll look at: package manifests, source structure, Docker/k8s configs, CI/CD workflows, API routes, database connections, and README documentation.

User pastes the URL in the chat input and sends.

**Phase B: Scan and Propose**

The `absolemSend` handler detects the URL and triggers the scan:

```typescript
// In AbsolemService — when command is 'repo-to-calm' and message looks like a URL
private async handleRepoToCalm(
  barPath: string,
  repoUrl: string,
  existingCalm: object,
  onChunk: (chunk: string, done: boolean) => void
): Promise<string> {

  // 1. Scan repo via GitHub MCP
  const repoContext = await this.scanRepository(repoUrl);

  // 2. Build the analysis prompt
  const prompt = this.buildRepoToCalmPrompt(repoContext, existingCalm);

  // 3. Stream LLM response (includes calm-patches fence)
  return await this.sendToLlm(conversation, onChunk);
}
```

#### 4. Repository Scanning Strategy

The scan uses GitHub MCP tools to read key files without cloning. The scanning is done by the LLM itself — we provide it with repo content and let it reason about architecture.

**Files to fetch (priority order):**

| Priority | File/Pattern | What It Reveals |
|----------|-------------|-----------------|
| 1 | Root file listing | Project structure, monorepo detection |
| 2 | `package.json` / `pyproject.toml` / `pom.xml` / `go.mod` | Language, framework, dependencies |
| 3 | `docker-compose.yml` | Services, databases, message queues, ports |
| 4 | `Dockerfile` / `Containerfile` | Runtime, base image, exposed ports |
| 5 | `README.md` | High-level architecture description |
| 6 | `.github/workflows/*.yml` | CI/CD pipeline, deployment targets |
| 7 | `k8s/` / `helm/` / `terraform/` | Infrastructure, deployment topology |
| 8 | `src/` or `app/` listing | Service boundaries, module structure |
| 9 | Route/controller files | API endpoints, interfaces |
| 10 | `.env.example` / config files | External service connections |

**Approach — LLM-Driven Scan:**

Rather than writing brittle file-parsing logic, we gather the key files and pass them to the LLM as context. The LLM is already excellent at reading code and inferring architecture. We provide:

```
Here is the repository structure and key files for {repoUrl}.
The BAR's existing CALM architecture is shown below.

Your task: Analyze this codebase and propose CALM patches that ADD
missing nodes and relationships. Do NOT remove existing nodes.

## Existing CALM Architecture
{existingCalmJson}

## Repository Contents
### File Tree
{fileTreeListing}

### package.json
{packageJsonContent}

### docker-compose.yml
{dockerComposeContent}

### README.md
{readmeContent}

... (other key files)

## Instructions
1. Identify services, databases, caches, queues, external systems, and actors
2. Map them to CALM node types (service, database, network, actor, etc.)
3. Identify relationships (connects-to, composed-of, deployed-in)
4. Compare against the existing CALM — only propose what's MISSING or DIFFERENT
5. For existing nodes that match, note them but don't re-add them
6. Output your patches in a ```calm-patches``` code fence
```

#### 5. GitHub MCP Integration

The VS Code GitHub MCP server provides tools for:
- `github_file_ops_get_file` — read individual files
- `github_repos_list_for_user` — list repos
- Directory listing via API

**Fallback for non-MCP environments:**
If GitHub MCP is unavailable, fall back to `gh api` via `execFileAsync`:
```typescript
// List repo tree
const { stdout } = await execFileAsync('gh', [
  'api', `repos/${owner}/${repo}/git/trees/HEAD`,
  '--jq', '.tree[] | .path'
]);

// Read a file
const { stdout: content } = await execFileAsync('gh', [
  'api', `repos/${owner}/${repo}/contents/${filePath}`,
  '--jq', '.content', '-H', 'Accept: application/vnd.github.raw+json'
]);
```

This approach works everywhere `gh` CLI is installed (already a prerequisite).

#### 6. Patch Generation

The LLM generates patches using the existing `calm-patches` format:

```json
[
  {
    "op": "addNode",
    "target": "nodes",
    "value": {
      "unique-id": "movie-api-redis",
      "name": "Redis Cache",
      "node-type": "database",
      "description": "In-memory cache for session storage (detected from package.json: ioredis)"
    }
  },
  {
    "op": "addRelationship",
    "target": "relationships",
    "value": {
      "unique-id": "movie-api-to-redis",
      "relationship-type": {
        "connects-to": {
          "source": { "node": "movie-api-service" },
          "destination": { "node": "movie-api-redis" }
        }
      },
      "protocol": "redis",
      "description": "Session caching and rate limiting"
    }
  },
  {
    "op": "updateNode",
    "target": "movie-api-service",
    "value": {
      "description": "Express.js REST API — Node 20, TypeScript, Mocha testing, MongoDB via Mongoose"
    }
  }
]
```

The existing `extractPatches()` and patches card UI handle this format already.

#### 7. Message Types

```typescript
// No new message types needed — uses existing:
// { type: 'absolemStart', barPath, command: 'repo-to-calm' }
// { type: 'absolemSend', barPath, message: '<repo-url>' }
// { type: 'absolemAcceptPatches', barPath, patches }

// The scanning happens inside AbsolemService when it detects
// the command is 'repo-to-calm' and the user message is a URL
```

---

## UX Details

### Command Chip

| Property | Value |
|----------|-------|
| Label | `Scan Repo` |
| Icon | `🔍` |
| Position | After `image-to-calm`, before `freeform` |
| Tooltip | Analyze a GitHub repo and propose CALM architecture patches |

### Chat Flow

```
[Absolem greeting]
"Paste a GitHub repository URL and I'll analyze the codebase
to propose CALM architecture patches."

[User sends URL]
https://github.com/AliceNN-ucdenver/movie-api

[Absolem streams response]
"Scanning repository... I found:

**Services**: Express.js REST API (movie-api)
**Database**: MongoDB via Mongoose
**Testing**: Mocha + Chai
**CI/CD**: GitHub Actions

**Already in CALM**: Movie API Service ✓
**Missing from CALM**:
- MongoDB database node
- GitHub Actions CI/CD node
- Connection: Movie API → MongoDB

Here are the proposed patches:"

[Patches card appears with accept/reject buttons]
```

### Edge Cases

| Case | Behavior |
|------|----------|
| Invalid URL | Absolem responds: "That doesn't look like a GitHub URL. Please paste a full URL like `https://github.com/org/repo`." |
| Private repo (no access) | Absolem responds: "I can't access that repository. Make sure you're authenticated with `gh auth login` and have read access." |
| Empty repo | Absolem responds: "This repository appears to be empty. There's nothing to scan yet." |
| Monorepo | Absolem asks: "This looks like a monorepo with multiple services. Which subdirectory should I focus on?" Then scans that subdirectory. |
| CALM already complete | Absolem responds: "Your CALM architecture already covers what I found in the repo. No patches needed — your architecture matches reality." |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `'repo-to-calm'` to `AbsolemCommand` union |
| `src/services/AbsolemService.ts` | Add `repo-to-calm` command handling, `scanRepository()`, `buildRepoToCalmPrompt()` |
| `src/webview/app/lookingGlass.ts` | Add `Scan Repo` chip to Absolem command list |
| `src/webview/LookingGlassPanel.ts` | Pass command through to AbsolemService (no changes needed — existing flow works) |

**No new files required.** The feature fits entirely within the existing Absolem command pattern.

---

## Integration with Add Repo + Scaffold

After the user accepts CALM patches from `repo-to-calm`, the natural next steps are:

1. **Add the repo to the BAR** — click "+ Add Repo" → paste the same URL → updates `app.yaml`
2. **Scaffold the repo** — clone locally → run scaffold → adds CLAUDE.md, CI/CD, prompt packs
3. **Run Security Scorecard** — after scaffold + push, CodeQL and fitness functions activate
4. **Remediate issues** — scorecard surfaces findings → create issues → assign agent

This is the full "bottom-up" governance flow: code exists → derive architecture → add governance → improve security.

---

## Future Enhancements

- **Auto-add repo after scan** — prompt "Would you like to add this repo to the BAR?" with one-click
- **Periodic re-scan** — detect architecture drift by re-scanning and comparing
- **Multi-repo scan** — scan all repos in a BAR and reconcile against CALM
- **PR-triggered scan** — when a PR changes architecture-significant files, auto-propose CALM updates
