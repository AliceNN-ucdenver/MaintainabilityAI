# Red Queen Quick Start Guide — IMDB Celebs End-to-End Test

This guide walks through testing the full Red Queen governance pipeline using the **IMDB Celebs** BAR (score: 5/100 = restricted tier) and a new `celeb-api` repo. The low score triggers full review board enforcement — security AND architecture reviews with consensus.

**What you'll do:**
1. Configure the governance mesh for agent orchestration
2. Create the `celeb-api` repo on GitHub
3. Scaffold governance files into it
4. Push to GitHub and create a PR
5. Verify the full governance review workflow triggers

---

## Prerequisites

- [x] `@maintainabilityai/redqueen-mcp` published to npm (v0.1.1+)
- [x] A governance mesh directory (local path — can be anywhere on your machine)
- [x] `npm login` completed
- [x] `NPM_TOKEN` GitHub secret set
- [ ] `ANTHROPIC_API_KEY` GitHub secret (needed for Claude review steps)
- [ ] `GOVERNANCE_MESH_TOKEN` GitHub secret (PAT with read access to your governance mesh repo)

> **Path conventions:** This guide uses `$MESH_PATH` for your governance mesh and `$REPO_PATH` for the code repo. Substitute your actual paths. On GitHub Actions, the mesh is always checked out to a deterministic path (`${{ github.workspace }}/governance-mesh`) by the workflow — no local path assumptions there.
>
> **Example:**
> ```bash
> export MESH_PATH=~/Documents/governance-mesh
> export REPO_PATH=~/projects/celeb-api
> ```

---

## Step 0: Upgrade Existing Governance Mesh (pre-Red Queen)

> **Skip this step** if you're creating a fresh governance mesh. This is only needed if your mesh was created with MaintainabilityAI **v0.1.9 or earlier** (before Red Queen was published).

Pre-Red Queen meshes are missing fields that the scaffold needs. Here's what to add:

### 0a. Add `agent_type` and `repo` to mesh.yaml

Red Queen needs to know which AI agent framework you use and where the mesh repo lives on GitHub.

#### Option A: Use Looking Glass Settings UI (recommended)

1. Open the **Looking Glass** panel in VS Code
2. Go to **Settings** (gear icon)
3. Under **Agent Framework**, select `claude`, `copilot`, or `both` from the dropdown
4. Click **Save**

This automatically:
- Places `agent_type` inside the `portfolio:` block (correct location)
- Auto-detects and saves the `repo` field from your git remote URL

#### Option B: Edit mesh.yaml manually

```bash
cd $MESH_PATH
```

Edit `mesh.yaml` — add `agent_type` and `repo` **inside** the `portfolio:` block:

```yaml
portfolio:
  id: PF-ALICEN-001
  name: "Rabbit Hole"
  org: "AliceNN-ucdenver"
  repo: "alicenn-ucdenver-governance-mesh"   # <-- ADD: GitHub repo name
  owner: "AliceNN-ucdenver"
  description: "Governance mesh for AliceNN-ucdenver"
  agent_type: claude                          # <-- ADD: claude | copilot | both
```

| Field | Required | Values | What it controls |
|-------|----------|--------|-----------------|
| `agent_type` | Yes | `claude`, `copilot`, `both` | Which review/implementation workflows are generated |
| `repo` | Yes | GitHub repo name or `org/repo` | Mesh checkout path in GitHub Actions workflows |

> **Important:** Both `agent_type` and `repo` must be inside the `portfolio:` block (indented under it), not at the root level. The Looking Glass Settings UI handles this automatically. If editing manually, ensure they are indented under `portfolio:`.

### 0b. Add orchestration policy (optional)

Without an `orchestration:` block, Red Queen uses sensible defaults:
- Autonomous: score >= 80, auto-edit mode, no human approval
- Supervised: score >= 50, ask-edit mode, human approval required
- Restricted: score < 50, plan-only mode, 2 agents + human approval

> **Note:** The `.redqueen/governance-context.md` file (full governance context with policy details, prompt injections, and escalation rules) is only generated when the `orchestration:` block is present in mesh.yaml. Without it, agents still receive tier-appropriate instructions via `AGENTS.md` and `.redqueen/decision.json`.

If you want to customize tier thresholds or permissions, add this to `mesh.yaml`:

```yaml
orchestration:
  version: 1
  permission_tiers:
    autonomous:
      min_score: 80
      permissions:
        mode: auto-edit
        allow: [Edit, Write, Bash, Read, Glob, Grep]
        deny: []
      review:
        agents: 1
        human_approval: false
    supervised:
      min_score: 50
      permissions:
        mode: ask-edit
        allow: [Edit, Read, Glob, Grep]
        deny: []
      review:
        agents: 1
        human_approval: true
    restricted:
      min_score: 0
      permissions:
        mode: plan
        allow: [Read, Glob, Grep]
        deny: [Bash, Write]
      review:
        agents: 2
        human_approval: true
  criticality_multipliers:
    critical:
      score_threshold_boost: 15
      require_multi_agent: true
    high:
      score_threshold_boost: 10
    medium:
      score_threshold_boost: 0
    low:
      score_threshold_boost: -10
```

### 0c. Add platform governance (optional)

If you want platform-level minimums (e.g., all BARs on IMDB Lite must have security score >= 40), add a `governance:` block to `platforms/imdb-lite/platform.yaml`:

```yaml
platform:
  id: PLT-IMDB
  name: "IMDB Lite"
  portfolio: PF-ALICEN-001
  owner: ""
  description: "A simple movie database application"
  governance:
    minimumScores:
      security: 40
      architecture: 30
    minTier: supervised
    enforcementMode: advisory
```

| Field | Effect |
|-------|--------|
| `minimumScores` | Platform floor — BAR can't be autonomous if below these |
| `minTier` | Platform cap — no BAR on this platform can be less than this tier |
| `enforcementMode` | `advisory` (warn) or `enforced` (block) |

### 0d. Verify your BARs have CALM architecture

The CALM flow validation (Step 10) requires each BAR to have a `bar.arch.json` file:

```
platforms/imdb-lite/bars/imdb-lite-application/architecture/bar.arch.json
platforms/imdb-lite/bars/imdb-celebs/architecture/bar.arch.json
```

If you created BARs through Looking Glass with the "IMDB Lite" template, these already exist. If not, create them using the Looking Glass CALM editor or manually.

### 0e. Commit mesh updates

```bash
cd $MESH_PATH
git add -A
git commit -m "Add Red Queen orchestration fields (agent_type, repo, governance)"
git push
```

### Quick checklist

| Item | Check | How to verify |
|------|-------|--------------|
| `agent_type` in mesh.yaml | Required | `grep agent_type mesh.yaml` |
| `repo` in mesh.yaml | Required | `grep repo mesh.yaml` |
| `orchestration:` in mesh.yaml | Optional (defaults used) | `grep orchestration mesh.yaml` |
| `governance:` in platform.yaml | Optional | `grep governance platforms/*/platform.yaml` |
| `bar.arch.json` per BAR | Required for CALM validation | `find . -name bar.arch.json` |
| Score history | Required for tier | `find . -name score-history.yaml` |

---

## Step 1: Verify Mesh Configuration

After the upgrades from Step 0, verify everything the scaffold needs:

```bash
cd $MESH_PATH

# Verify agent_type is set
grep agent_type mesh.yaml

# Verify repo is set
grep repo mesh.yaml

# Verify CALM models exist
find . -name "bar.arch.json"

# Verify scores exist
find . -name "score-history.yaml" -exec head -5 {} \;

# Test the scaffold reads correctly
npx @maintainabilityai/redqueen-mcp \
  --mesh-path $MESH_PATH \
  --scaffold \
  --bar "IMDB Celebs" 2>/dev/null | \
  node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log('BAR:', d.barName, '| Tier:', d.tier, '| Files:', Object.keys(d.files).length);"
```

Expected:
```
BAR: IMDB Celebs | Tier: restricted | Files: 16
```

If you get fewer than 16 files, the review workflow and implementation workflow are missing — check that `agent_type` is set correctly.

---

## Step 2: Create the `celeb-api` repo

The IMDB Celebs BAR references `celeb-api` but the repo doesn't exist yet:

```bash
# Create the repo on GitHub (clones into a celeb-api/ directory under CWD)
cd "$(dirname "$REPO_PATH")"
gh repo create AliceNN-ucdenver/celeb-api --public --clone
cd celeb-api

# Add a minimal package.json so it's not empty
npm init -y
echo "node_modules/" > .gitignore

# Initial commit
git add .
git commit -m "Initial commit — celeb-api skeleton"
git push origin main
```

---

## Step 3: Scaffold Governance into celeb-api

```bash
cd $REPO_PATH

# Create a feature branch
git checkout -b feature/redqueen-governance

# Run the scaffold — IMDB Celebs BAR (score 5 = restricted tier)
npx @maintainabilityai/redqueen-mcp \
  --mesh-path $MESH_PATH \
  --scaffold \
  --bar "IMDB Celebs" 2>/dev/null > /tmp/scaffold.json

# Check what we got
node -e "
  const d = JSON.parse(require('fs').readFileSync('/tmp/scaffold.json','utf8'));
  console.log('BAR:', d.barName);
  console.log('Tier:', d.tier);
  console.log('Files:', Object.keys(d.files).length);
  console.log();
  Object.keys(d.files).forEach(f => console.log('  ' + f));
"
```

Expected output:
```
BAR: IMDB Celebs
Tier: restricted
Files: 16

  .mcp.json
  .claude/settings.json
  AGENTS.md
  .redqueen/governance-context.md
  .redqueen/decision.json
  .redqueen/hooks/validate-tool.js
  .redqueen/hooks/validate-tool.sh
  .redqueen/policy.json
  .github/hooks/redqueen.json
  .github/copilot-governance-steps.yml
  .github/workflows/redqueen-review.yml
  .redqueen/consensus.js
  .claude/agents/security-reviewer.md
  .claude/agents/architecture-reviewer.md
  .github/workflows/redqueen-implement.yml
  .redqueen/config-manifest.yaml
```

### Write the files to disk

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('/tmp/scaffold.json', 'utf8'));
const path = require('path');
const fs = require('fs');
for (const [filePath, content] of Object.entries(data.files)) {
  const fullPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('  wrote', filePath);
}
"

# Make the shell wrapper executable
chmod +x .redqueen/hooks/validate-tool.sh
```

---

## Step 4: Inspect Key Files

### Check the governance tier
```bash
node -e "
  const d = JSON.parse(require('fs').readFileSync('.redqueen/decision.json','utf8'));
  console.log('BAR:', d.barName);
  console.log('Tier:', d.effectiveTier);
  console.log('Score:', d.compositeScore);
  console.log('Criticality:', d.criticality);
"
```

Expected output (**restricted** tier because score is 5):
```
BAR: IMDB Celebs
Tier: restricted
Score: 5
Criticality: medium
```

### Check the hook settings
The restricted tier hooks match more tools (including `Read`):
```bash
cat .claude/settings.json | python3 -m json.tool
```

### Check the review workflow
```bash
head -30 .github/workflows/redqueen-review.yml
```

The review workflow will run **both** security AND architecture reviews because the tier is `restricted`.

### Check the AGENTS.md
```bash
cat AGENTS.md
```

Should show restricted-tier instructions: "Plan first, implement after approval."

---

## Step 5: Set Up GitHub Secrets

The review and implementation workflows need these secrets on `celeb-api`:

```bash
# Required for Claude Code Action review steps
gh secret set ANTHROPIC_API_KEY --repo AliceNN-ucdenver/celeb-api

# Required to checkout the private governance mesh repo
gh secret set GOVERNANCE_MESH_TOKEN --repo AliceNN-ucdenver/celeb-api
```

For `GOVERNANCE_MESH_TOKEN`, create a GitHub PAT (fine-grained) with:
- **Repository access**: `alicenn-ucdenver-governance-mesh`
- **Permissions**: Contents (read)

---

## Step 6: Push and Create a PR

```bash
cd $REPO_PATH

git add .
git commit -m "Add Red Queen governance scaffolding

Scaffolded from governance mesh (IMDB Celebs BAR).
Score: 5/100 — restricted tier — full review enforcement.
Includes: MCP config, PreToolUse hooks, review workflow,
implementation workflow, subagent definitions, governance context.

🤖 AI-assisted with Claude Code using Red Queen scaffold"

git push origin feature/redqueen-governance
```

Create the PR:
```bash
gh pr create \
  --repo AliceNN-ucdenver/celeb-api \
  --title "Add Red Queen governance — restricted tier" \
  --body "## Summary
- Scaffolded Red Queen governance files from the governance mesh
- **BAR: IMDB Celebs** — Composite Score: 5/100 — **Restricted Tier**
- Full review enforcement: security + architecture reviews with consensus
- PreToolUse hook enforcement for both Claude Code and Copilot
- Automated PR review workflow (redqueen-review.yml)
- Issue implementation workflow (redqueen-implement.yml)

## Governance Context
- Architecture: 20/100
- Security: 0/100
- Information Risk: 0/100
- Operations: 0/100

## What happens on future PRs
1. Red Queen Review workflow triggers automatically
2. Claude security reviewer analyzes the diff
3. Claude architecture reviewer checks CALM compliance
4. Consensus script aggregates verdicts
5. Review summary posted as PR comment

## Test Plan
- [ ] Verify governance files are present
- [ ] Merge this PR to enable the review workflow
- [ ] Create a follow-up PR to trigger the full review pipeline

🤖 Generated with Red Queen governance scaffold"
```

---

## Step 7: Merge and Test the Review Pipeline

**Important:** The review workflow must be on the default branch (main) before it can trigger. So:

1. **Merge the governance PR** from Step 6
2. **Create a test change** to trigger the review:

```bash
cd $REPO_PATH
git checkout main
git pull

# Create a test branch with a small change
git checkout -b feature/add-health-check

mkdir -p src
cat > src/health.js << 'EOF'
// Health check endpoint for celeb-api
module.exports = function healthCheck(req, res) {
  res.json({ status: 'ok', timestamp: Date.now(), service: 'celeb-api' });
};
EOF

git add src/health.js
git commit -m "Add health check endpoint"
git push origin feature/add-health-check

# Create PR — this should trigger the Red Queen Review workflow
gh pr create \
  --repo AliceNN-ucdenver/celeb-api \
  --title "Add health check endpoint" \
  --body "Simple health check endpoint for monitoring.

Should trigger Red Queen restricted-tier review (security + architecture)."
```

3. **Watch the Actions tab** — you should see:
   - "Red Queen Review" workflow starts
   - "Determine review depth" step outputs `tier=restricted`
   - "Claude Security Review" step runs (if ANTHROPIC_API_KEY is set)
   - "Claude Architecture Review" step runs
   - "Red Queen Consensus" step aggregates verdicts
   - "Post review summary" step comments on the PR

---

## Step 8: Test the Implementation Workflow

The implementation workflow triggers when an issue is labeled `implement` or `claude-code`:

```bash
# Create a test issue
gh issue create \
  --repo AliceNN-ucdenver/celeb-api \
  --title "Add celebrity profile endpoint" \
  --body "Add a GET /api/celebs/:id endpoint that returns a celebrity profile.

Fields: id, name, bio, filmography (array of movie titles).

For now, use hardcoded sample data (no database needed yet).

Acceptance criteria:
- Returns 200 with JSON body
- Returns 404 for unknown IDs
- Follows Express routing patterns"

# Note the issue number from the output, then label it:
gh issue edit <ISSUE_NUMBER> \
  --repo AliceNN-ucdenver/celeb-api \
  --add-label "implement"
```

The workflow will:
1. Check out code + governance mesh
2. Read governance context (restricted tier)
3. Launch Claude Code Action to implement the feature
4. Create a branch, commit, and open a PR
5. That PR then triggers the review workflow!

---

## Step 9: Test Hook Enforcement Locally

```bash
cd $REPO_PATH

# Test: allowed tool call (Edit on normal file)
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/health.js"}}' | \
  node .redqueen/hooks/validate-tool.js

# Test: read-only tools are always allowed
echo '{"tool_name":"Read","tool_input":{"file_path":"package.json"}}' | \
  node .redqueen/hooks/validate-tool.js
```

Expected output (allowed):
```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse"}}
```

---

## Step 10: CALM Flow Validation Experiment

This experiment demonstrates that Red Queen enforces architectural constraints **at every tier** — even autonomous BARs can't silently bypass their CALM architecture model.

The IMDB Celebs CALM model declares these valid connections:

```
celeb-frontend → celeb-api → celeb-db   (allowed)
celeb-api → news-feed                   (allowed)
celeb-frontend → celeb-db               NOT DECLARED (violation!)
```

### Experiment A: Validate connections via MCP client

Install the MCP client SDK (one-time, from your celeb-api repo):

```bash
cd $REPO_PATH
npm install --save-dev @modelcontextprotocol/sdk
```

Create `test-calm.js`:

```javascript
// test-calm.js — validate CALM architectural constraints via MCP
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const MESH = process.env.MESH_PATH;
if (!MESH) { console.error('Set MESH_PATH env var first'); process.exit(1); }

async function test(client, label, args) {
  console.log(`\n${label}`);
  const result = await client.callTool({ name: 'validate_action', arguments: args });
  const parsed = JSON.parse(result.content[0].text);
  const verdict = parsed.verdict || (parsed.allowed ? 'approved' : 'denied');
  console.log(`  Verdict: ${verdict}`);
  if (parsed.violations?.length) {
    parsed.violations.forEach(v => console.log(`  ${v.ruleId}: ${v.message}`));
  }
}

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@maintainabilityai/redqueen-mcp', '--mesh-path', MESH],
  });
  const client = new Client({ name: 'calm-test', version: '1.0.0' }, {});
  await client.connect(transport);

  // Test 1: Valid — frontend calls API (declared in CALM model)
  await test(client, '✓ Frontend → API (valid)', {
    barName: 'IMDB Celebs', actionType: 'add_endpoint',
    description: 'Add GET /celebrities endpoint',
    sourceNode: 'celeb-frontend', targetNode: 'celeb-api',
  });

  // Test 2: Invalid — frontend bypasses API to hit DB directly
  await test(client, '✗ Frontend → Database (invalid — bypasses API)', {
    barName: 'IMDB Celebs', actionType: 'add_database_connection',
    description: 'Direct MongoDB connection from React frontend',
    sourceNode: 'celeb-frontend', targetNode: 'celeb-db',
  });

  // Test 3: Valid — API fetches from external news feed
  await test(client, '✓ API → News Feed (valid)', {
    barName: 'IMDB Celebs', actionType: 'add_endpoint',
    description: 'Fetch RSS articles from news feed',
    sourceNode: 'celeb-api', targetNode: 'news-feed',
  });

  await client.close();
}

main().catch(console.error);
```

Run it:

```bash
node test-calm.js
```

Expected output:

```
✓ Frontend → API (valid)
  Verdict: approved

✗ Frontend → Database (invalid — bypasses API)
  Verdict: denied
  CALM-004: No CALM relationship declares the connection celeb-frontend → celeb-db.

✓ API → News Feed (valid)
  Verdict: approved
```

The CALM model (`bar.arch.json`) declares these valid paths:
- `celeb-frontend → celeb-api` (relationship: `celeb-frontend-to-api`)
- `celeb-api → celeb-db` (relationship: `celeb-api-to-db`)
- `celeb-api → news-feed` (relationship: `celebs-to-newsfeed`)

There is **no** `celeb-frontend → celeb-db` relationship. Any agent request that bypasses the API layer gets denied with `CALM-004`.

### Experiment B: Test with Claude Code directly

After scaffolding, open `celeb-api` in VS Code with Claude Code. Try asking:

> "Add a MongoDB connection directly from the React frontend to query celebrity data"

Claude will call `validate_action` and get denied. The agent should then propose the architecturally correct approach: add the endpoint to `celeb-api` and have the frontend call the API.

### Why this matters

| Scenario | Agent Request | CALM Verdict | Reason |
|----------|--------------|--------------|--------|
| Frontend → API | "Add GET /celebs endpoint" | Approved | Declared relationship |
| API → Database | "Query celeb documents" | Approved | Declared relationship |
| Frontend → Database | "Direct MongoDB from React" | **Denied** | No CALM relationship |
| API → News Feed | "Fetch RSS articles" | Approved | Declared relationship |
| Frontend → News Feed | "Direct RSS from React" | **Denied** | No CALM relationship |

This enforcement happens at **every tier** — autonomous, supervised, and restricted. The tier controls *how much friction* (hooks, reviews, permissions), but CALM architectural constraints are **always enforced**. A high-scoring BAR earns trust to operate with less oversight, but it still can't violate its own declared architecture.

---

## What You Should See

| Step | Expected Result |
|------|----------------|
| Scaffold | 16 governance files generated, tier = restricted |
| decision.json | `effectiveTier: "restricted"`, score 5 |
| AGENTS.md | Restricted instructions: "Plan first, implement after approval" |
| settings.json | Hooks on Edit, Write, Bash, **and Read** (restricted matches more) |
| redqueen-review.yml | Both security + architecture reviews enabled |
| PR review | Claude reviews diff, consensus posted as PR comment |
| Implementation | Claude creates branch + PR from labeled issue |
| CALM valid flow | `celeb-frontend → celeb-api` = approved |
| CALM invalid flow | `celeb-frontend → celeb-db` = **denied** (CALM-004) |

---

## Troubleshooting

### Review workflow doesn't trigger
- The workflow file must be on the **default branch** (main) first
- Merge the governance PR, then create a new PR to trigger it
- Check Actions tab → "Red Queen Review" workflow

### "GOVERNANCE_MESH_TOKEN" error
- Create a fine-grained PAT with read access to `alicenn-ucdenver-governance-mesh`
- Set it: `gh secret set GOVERNANCE_MESH_TOKEN --repo AliceNN-ucdenver/celeb-api`

### Claude review step fails
- Verify `ANTHROPIC_API_KEY` is set: `gh secret list --repo AliceNN-ucdenver/celeb-api`
- Check the workflow logs in Actions for the specific error

### "implement" label doesn't exist
- Create it first: `gh label create implement --repo AliceNN-ucdenver/celeb-api`

### Score too low — everything is restricted
- That's the point! Score 5 = restricted tier = maximum governance enforcement
- As you add security controls, architecture docs, etc., scores will rise and tier will relax

---

## Two-BAR Comparison

| | IMDB Lite Application | IMDB Celebs |
|---|---|---|
| Score | 90/100 | 5/100 |
| Tier | Autonomous | **Restricted** |
| Security Review | Skipped | **Enabled** |
| Architecture Review | Skipped | **Enabled** |
| Hook Scope | Edit, Write, Bash | Edit, Write, Bash, **Read** |
| Agent Freedom | Implement freely | Plan first, implement after approval |

This contrast shows how Red Queen adapts governance pressure based on the maturity of each BAR.

---

## What's Next (Phase 9)

- **Hard Enforcement Gate** — `redqueen-action` GitHub Action as required status check
- **Break-Glass Override** — Controlled bypass with CODEOWNER approval
- **Branch Protection** — Auto-configure required checks per governance tier
