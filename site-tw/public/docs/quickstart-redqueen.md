<div class="docs-hero docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><span>Quickstart</span><span class="sep">/</span><span>Red Queen</span></div>
    <div class="docs-eyebrow">Quickstart · IMDB Celebs end-to-end <span class="docs-hero-meta">~8 min read</span></div>
    <h1 class="docs-hero-title">Install the Red Queen against a real repository</h1>
    <p class="docs-hero-copy">A hands-on walkthrough that puts pre-tool hooks, MCP validation, and a fail-closed review workflow into a real GitHub repo. We use the low-scoring <strong>IMDB Celebs</strong> BAR (5/100, restricted tier) so the strictest enforcement path actually fires &mdash; the Queen has no patience for tea-parties.</p>
    <span class="docs-hero-flourish">&ldquo;Off with their heads &mdash; the override needs a reason.&rdquo;</span>
  </div>
</div>

## What you&rsquo;ll build, in three phases

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-blue">
    <div class="docs-card-kicker">Phase 1 &middot; Steps 0&ndash;1</div>
    <h3 class="docs-card-title">Prepare the governance mesh</h3>
    <p class="docs-card-body">Upgrade a pre-Red Queen mesh (skip if it&rsquo;s already current), add orchestration policy, verify CALM models and scores. Output: a mesh ready to feed a scaffold.</p>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Phase 2 &middot; Steps 2&ndash;6</div>
    <h3 class="docs-card-title">Bootstrap the celeb-api repo</h3>
    <p class="docs-card-body">Create the GitHub repo, run the Cheshire scaffold against the low-scoring BAR, inspect the generated hooks and MCP runner, set the secrets, push and open a PR.</p>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Phase 3 &middot; Steps 7&ndash;10</div>
    <h3 class="docs-card-title">Verify enforcement fires end-to-end</h3>
    <p class="docs-card-body">Trip a pre-tool hook on purpose. Watch the review workflow fail closed. Test the CALM flow validator on a real diff. Confirm the merge gate behaves like an enterprise audit team expects.</p>
  </div>
</div>

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>Enforcement boundary today:</strong> Red Queen ships two working control points &mdash; pre-tool hooks (fast local / agent feedback) and MCP <code>validate_action</code> (deterministic architecture validation). The generated review workflow fails closed when reviewers do not produce verdicts; hard merge blocking requires you to mark the workflow as a required status check. The standalone <code>redqueen-action</code> hard gate is planned for <a href="/docs/impossible-things#the-road-ahead" class="markdown-link">Phase 9</a>.</p>
</div>

---

## Prerequisites

- [x] `@maintainabilityai/redqueen-mcp` published to npm (v0.1.3+ for `--output` + `--doctor`)
- [x] A governance mesh directory (local path — can be anywhere on your machine)
- [x] `npm login` completed
- [x] `NPM_TOKEN` GitHub secret set
- [ ] `ANTHROPIC_API_KEY` GitHub secret (needed for Claude review steps)
- [ ] `GOVERNANCE_MESH_TOKEN` GitHub secret (PAT with read access to your governance mesh repo)

> **Path conventions:** This guide uses `$MESH_PATH` for your governance mesh and `$REPO_PATH` for the code repo. Substitute your actual paths. Scaffolded repos include a self-contained `.redqueen/mcp-runner.js`; it resolves the live mesh from `RED_QUEEN_MESH_PATH`, `GOVERNANCE_MESH_PATH`, `MESH_PATH`, or a local `./governance-mesh` checkout. On GitHub Actions, the mesh is checked out to `${{ github.workspace }}/governance-mesh` by the workflow.
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
BAR: IMDB Celebs | Tier: restricted | Files: 17
```

If you get fewer than 17 files, the MCP runner, review workflow, or implementation workflow is missing — check that `agent_type` is set correctly. If `agent_type: both`, expect additional Copilot reviewer instruction files.

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
  --bar "IMDB Celebs" \
  --output "$REPO_PATH"

# First-run health check. This verifies required files, executable hooks,
# MCP runner mesh resolution, Copilot hook shape, policy rules, and manifest fingerprints.
npx @maintainabilityai/redqueen-mcp \
  --doctor \
  --repo "$REPO_PATH"
```

Expected output:
```json
{
  "ok": true,
  "errors": []
}
```

The scaffold writes the hook wrapper and MCP runner as executable. You should not need a manual `chmod`. The code repo does **not** copy the full governance mesh; it carries a compiled policy snapshot for fast hooks and uses the runner to connect MCP tools to the live mesh.

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
Score: 5/100 — restricted tier — fail-closed review consensus.
Includes: MCP config + runner, PreToolUse hooks, review workflow,
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
- Restricted-tier review: security + architecture reviewers with consensus
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

### 7a. Make the workflow a required status check (close the merge loop)

The review workflow can fail closed today, but it does not block merges until you mark it as a **required status check** in branch protection. This is the step that turns the workflow from advisory into a hard merge gate.

Run this once per protected branch:

```bash
gh api repos/AliceNN-ucdenver/celeb-api/branches/main/protection \
  --method PUT \
  --field 'required_status_checks[strict]=true' \
  --field 'required_status_checks[contexts][]=Red Queen Review / redqueen-review' \
  --field 'enforce_admins=true' \
  --field 'required_pull_request_reviews[required_approving_review_count]=1' \
  --field 'restrictions=null'
```

Or via the UI: **Settings &rarr; Branches &rarr; Branch protection rules &rarr; main &rarr; Require status checks to pass before merging &rarr; add "Red Queen Review / redqueen-review"**.

After this, any PR where the Red Queen Review workflow fails closed (missing verdicts, consensus rejection, governance violation) cannot be merged, even by admins. This is the boundary between "advisory" and "deterministic" enforcement.

> **Reminder:** the hard `redqueen-action` standalone CI gate is still planned for [Phase 9](/docs/impossible-things#the-road-ahead). What you just configured is the strongest enforcement boundary available today.

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

# Test: read-only tools are always allowed
echo '{"tool_name":"Read","tool_input":{"file_path":"package.json"}}' | \
  ./.redqueen/hooks/validate-tool.sh

# Test: restricted tier blocks Edit until approval is recorded
set +e
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/health.js"}}' | \
  ./.redqueen/hooks/validate-tool.sh
echo "exit=$?"
set -e

# Test: approved restricted-tier edit is allowed
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/health.js"}}' | \
  REDQUEEN_PLAN_APPROVED=true ./.redqueen/hooks/validate-tool.sh

# Test: restricted tier denies Bash
set +e
echo '{"tool_name":"Bash","tool_input":{"command":"npm install left-pad"}}' | \
  ./.redqueen/hooks/validate-tool.sh
echo "exit=$?"
set -e

# Test: Copilot hook mode returns permissionDecision JSON instead of exit-code blocking
echo '{"toolName":"bash","toolArgs":{"command":"npm test"}}' | \
  AGENT_TYPE=copilot ./.redqueen/hooks/validate-tool.sh
```

Expected allowed output contains:
```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}
```

Expected restricted-tier denials exit with `2` for Claude-style hooks and return `"permissionDecision":"deny"` for Copilot-style hooks.

---

## Step 10: CALM Flow Validation Experiment

This experiment demonstrates deterministic CALM validation through the MCP `validate_action` tool. Hooks provide fast static blocking; MCP validation provides richer architecture feedback. The Phase 9 CI gate will be the non-bypassable merge boundary.

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

The same CALM rule applies at every tier — autonomous, supervised, and restricted. The tier controls *how much friction* (hooks, reviews, permissions), while `validate_action` evaluates declared architecture relationships the same way for every BAR.

---

## What You Should See

| Step | Expected Result |
|------|----------------|
| Scaffold | Governance files generated, tier = restricted, `--doctor` returns `ok: true` |
| decision.json | `effectiveTier: "restricted"`, score 5 |
| AGENTS.md | Restricted instructions: "Plan first, implement after approval" |
| settings.json | Hooks on Edit, Write, Bash, **and Read** (restricted matches more) |
| redqueen-review.yml | Both security + architecture reviews enabled |
| PR review | Claude reviews diff, consensus posted as PR comment; workflow fails closed on missing verdicts |
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
