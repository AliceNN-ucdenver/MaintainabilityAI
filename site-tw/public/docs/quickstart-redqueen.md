<div class="docs-hero docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><span>Quickstart</span><span class="sep">/</span><span>Red Queen</span></div>
    <div class="docs-eyebrow">Quickstart · IMDB Celebs end-to-end <span class="docs-hero-meta">~8 min read</span></div>
    <h1 class="docs-hero-title">Install the Red Queen against a real repository</h1>
    <p class="docs-hero-copy">A hands-on walkthrough that puts pre-tool hooks, MCP validation, and the always-on impl-provenance gate into a real GitHub repo. We use the low-scoring <strong>IMDB Celebs</strong> BAR (5/100, restricted tier) so the strictest enforcement path actually fires &mdash; the Queen has no patience for tea-parties.</p>
    <span class="docs-hero-flourish">&ldquo;Speak when you&rsquo;re spoken to &mdash; the override needs a reason.&rdquo;</span>
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
    <p class="docs-card-body">Create the GitHub repo, run the Cheshire scaffold against the low-scoring BAR, inspect the generated PreToolUse hooks and baked <code>.redqueen/policy.json</code>, set the secrets, push and open a PR.</p>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Phase 3 &middot; Steps 7&ndash;10</div>
    <h3 class="docs-card-title">Verify enforcement fires end-to-end</h3>
    <p class="docs-card-body">Trip a pre-tool hook on purpose. Watch the impl-provenance gate verify the signed chain. Test the CALM flow validator on a real diff. Confirm the merge gate behaves like an enterprise audit team expects.</p>
  </div>
</div>

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>Enforcement boundary today:</strong> the shipped code-repo control point is the <strong>PreToolUse hook</strong> against the baked <code>.redqueen/policy.json</code> (fast local / agent feedback, deny-before-write). Implementation PRs are guarded server-side by the always-on <code>impl-provenance.yml</code> gate, which verifies the signed audit chain, skill manifest, Hatter Tag, and Red Queen decision log &mdash; and the implementation agent runs its own embedded Architect + Security self-review (the "Tweedles") inside its loop. MCP <code>validate_action</code> (deterministic architecture validation) is available as an optional local enrichment via the standalone <code>@maintainabilityai/redqueen-mcp</code> server run against a mesh checkout &mdash; see the Step 10 experiment. The standalone <code>redqueen-action</code> hard gate and the Hatter-grade signed evidence chain for Red Queen decisions are planned for <a href="/docs/red-queens-court#queens-next-act" class="markdown-link">Queen's Next Act</a>.</p>
</div>

---

## Prerequisites

- [x] `@maintainabilityai/redqueen-mcp` published to npm (v0.1.3+ for `--output` + `--doctor`)
- [x] A governance mesh directory (local path — can be anywhere on your machine)
- [x] `npm login` completed
- [x] `NPM_TOKEN` GitHub secret set
- [ ] `GOVERNANCE_MESH_TOKEN` GitHub secret (PAT with read access to your governance mesh repo)

(No Anthropic/OpenAI key needed — Alice, the implementation agent, runs as a Copilot persona on the Actions `GITHUB_TOKEN`.)

> **Path conventions:** This guide uses `$MESH_PATH` for your governance mesh and `$REPO_PATH` for the code repo. Substitute your actual paths. The shipped code-repo enforcement is the **PreToolUse hook** against the baked `.redqueen/policy.json` — the scaffold does **not** write an MCP runner into the code repo. The optional `validate_action` experiment in Step 10 instead uses the standalone `@maintainabilityai/redqueen-mcp` server (from the prereqs) run against your local mesh checkout, resolving the mesh from `$MESH_PATH`. On GitHub Actions, the mesh is checked out to `${{ github.workspace }}/governance-mesh` by the workflow.
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

### 0a. Add `repo` to mesh.yaml

Red Queen needs to know where the mesh repo lives on GitHub so generated workflows can check it out.

#### Option A: Use Looking Glass Settings UI (recommended)

1. Open the **Looking Glass** panel in VS Code
2. Go to **Settings** (gear icon)
3. Confirm the mesh **repo** is detected from your git remote URL
4. Click **Save**

This automatically auto-detects and saves the `repo` field from your git remote URL, placed inside the `portfolio:` block.

#### Option B: Edit mesh.yaml manually

```bash
cd $MESH_PATH
```

Edit `mesh.yaml` — add `repo` **inside** the `portfolio:` block:

```yaml
portfolio:
  id: PF-ALICEN-001
  name: "Rabbit Hole"
  org: "AliceNN-ucdenver"
  repo: "alicenn-ucdenver-governance-mesh"   # <-- ADD: GitHub repo name
  owner: "AliceNN-ucdenver"
  description: "Governance mesh for AliceNN-ucdenver"
```

| Field | Required | Values | What it controls |
|-------|----------|--------|-----------------|
| `repo` | Yes | GitHub repo name or `org/repo` | Mesh checkout path in GitHub Actions workflows |

> **Important:** `repo` must be inside the `portfolio:` block (indented under it), not at the root level. The Looking Glass Settings UI handles this automatically. If editing manually, ensure it is indented under `portfolio:`.

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
git commit -m "Add Red Queen orchestration fields (repo, governance)"
git push
```

### Quick checklist

| Item | Check | How to verify |
|------|-------|--------------|
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

If you get fewer than the expected file count, the PreToolUse hooks, the baked `.redqueen/policy.json`, or the `impl-provenance.yml` gate may be missing — re-run the scaffold and the `--doctor` check (Step 3).

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
# Copilot hook shape, policy rules, and manifest fingerprints.
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

The scaffold writes the hook wrapper as executable. You should not need a manual `chmod`. The code repo does **not** copy the full governance mesh; it carries a compiled policy snapshot (`.redqueen/policy.json`) that the PreToolUse hook reads for fast, deny-before-write enforcement. (The `validate_action` MCP tool — used in the optional Step 10 experiment — lives in the standalone `@maintainabilityai/redqueen-mcp` server, not in the scaffolded code repo.)

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

### Check the impl-provenance gate
```bash
head -30 .github/workflows/impl-provenance.yml
```

This always-on gate verifies the signed audit chain, skill manifest, Hatter Tag, and Red Queen decision log on every implementation PR. The implementation agent runs its own embedded Architect + Security self-review (the "Tweedles") inside its loop; the gate verifies the resulting evidence rather than dispatching separate reviewer bots.

### Check the AGENTS.md
```bash
cat AGENTS.md
```

Should show restricted-tier instructions: "Plan first, implement after approval."

---

## Step 5: Set Up GitHub Secrets

The impl-provenance gate needs this secret on `celeb-api` (Alice, the implementation agent, runs as a Copilot persona on the Actions `GITHUB_TOKEN` — no Anthropic/OpenAI key required):

```bash
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
Score: 5/100 — restricted tier — strictest enforcement path.
Includes: PreToolUse hooks + baked .redqueen/policy.json, impl-provenance gate,
governance context.

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
- Restricted-tier enforcement: hooks block Bash/Write, Edit needs recorded approval
- PreToolUse hook enforcement for both Claude Code and Copilot
- Always-on impl-provenance gate (impl-provenance.yml) over the signed chain

## Governance Context
- Architecture: 20/100
- Security: 0/100
- Information Risk: 0/100
- Operations: 0/100

## What happens on implementation PRs
1. The implementation agent runs embedded Architect + Security self-review (the Tweedles) inside its loop
2. Each persona's verdict is signed into the agent's own audit chain
3. The impl-provenance.yml gate verifies the signed chain, skill manifest, Hatter Tag, and Red Queen decision log
4. The gate fails closed if the evidence is missing or the chain does not verify

## Test Plan
- [ ] Verify governance files are present
- [ ] Trip a PreToolUse hook locally (Step 9)
- [ ] Confirm the impl-provenance gate runs on an implementation PR

🤖 Generated with Red Queen governance scaffold"
```

---

## Step 7: Merge and Test the impl-provenance Gate

**Important:** The `impl-provenance.yml` gate must be on the default branch (main) before it can trigger. So:

1. **Merge the governance PR** from Step 6
2. **Create a test change** to exercise the gate:

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

# Create PR — the impl-provenance gate runs on implementation PRs
gh pr create \
  --repo AliceNN-ucdenver/celeb-api \
  --title "Add health check endpoint" \
  --body "Simple health check endpoint for monitoring.

Restricted tier — the impl-provenance gate verifies the signed audit chain."
```

3. **Watch the Actions tab** — on an implementation PR you should see:
   - The `impl-provenance` workflow starts
   - It verifies the signed audit chain (Knight's Seal signatures + hash replay)
   - It checks the skill manifest, the Hatter Tag continuation block, and the Red Queen decision log
   - It fails closed if the evidence is missing or the chain does not verify

> A plain hand-edited PR like the one above has no implementation-agent chain to verify, so the gate reports the missing evidence rather than a passing review. The full signed chain is produced when the **implementation agent** runs against a fan-out landing issue (Step 8).

### 7a. Make the gate a required status check (close the merge loop)

The `impl-provenance` gate runs on every implementation PR today, but it does not block merges until you mark it as a **required status check** in branch protection. This is the step that turns the gate into a hard merge gate.

Run this once per protected branch:

```bash
gh api repos/AliceNN-ucdenver/celeb-api/branches/main/protection \
  --method PUT \
  --field 'required_status_checks[strict]=true' \
  --field 'required_status_checks[contexts][]=impl-provenance' \
  --field 'enforce_admins=true' \
  --field 'required_pull_request_reviews[required_approving_review_count]=1' \
  --field 'restrictions=null'
```

Or via the UI: **Settings &rarr; Branches &rarr; Branch protection rules &rarr; main &rarr; Require status checks to pass before merging &rarr; add "impl-provenance"**.

After this, any implementation PR whose signed chain does not verify (missing evidence, broken chain, governance violation) cannot be merged, even by admins. This is the boundary between "advisory" and "deterministic" enforcement.

> **Reminder:** the hard `redqueen-action` standalone CI gate is still planned for [Queen's Next Act](/docs/red-queens-court#queens-next-act). What you just configured is the strongest enforcement boundary available today.

---

## Step 8: Run the Implementation Agent

Implementation work reaches `celeb-api` as a **fan-out landing issue** opened by Looking Glass after a code design merges (see the [Hatter's Tea Party](/docs/hatters-tea-party) hand-off). Each landing issue carries the approved design slice, the OKR's governance tier, and the parent audit thread. An implementation agent is assigned to the issue and runs inside the repo:

1. Reads the landing issue: design slice, governance context (restricted tier), parent chain markers
2. Runs embedded **Architect + Security self-review** (the "Tweedles") inside its own loop, signing each persona's verdict into its audit chain
3. Writes its per-event Ed25519-signed **implementation chain** to `<repo>/.maintainability/audit/`
4. Opens a PR whose body carries the continuation block (parent run, parent chain root, in-repo event log path)
5. From the first tool call, the **Red Queen governs** every Edit / Write / Bash via the PreToolUse hooks
6. The `impl-provenance.yml` gate then verifies that signed chain before merge

The agent does not need a separate reviewer-bot court: the embedded self-review plus the server-side provenance gate provide the coverage a separate review workflow used to.

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

This experiment demonstrates deterministic CALM validation through the MCP `validate_action` tool. Hooks provide fast static blocking; MCP validation provides richer architecture feedback. The Queen's Next Act CI gate (`redqueen-action`) will be the non-bypassable merge boundary.

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

When the agent tries to write the change, the **PreToolUse hook** checks it against the baked `.redqueen/policy.json` (which carries the compiled CALM flow constraints) and denies the write before it lands. The agent should then propose the architecturally correct approach: add the endpoint to `celeb-api` and have the frontend call the API.

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
| impl-provenance.yml | Always-on gate verifying the signed audit chain on implementation PRs |
| Implementation PR | Embedded Architect + Security self-review signed into the chain; impl-provenance gate fails closed on missing/invalid evidence |
| Implementation | Implementation agent runs against a fan-out landing issue, opens a PR |
| CALM valid flow | `celeb-frontend → celeb-api` = approved |
| CALM invalid flow | `celeb-frontend → celeb-db` = **denied** (CALM-004) |

---

## Troubleshooting

### impl-provenance gate doesn't trigger
- The workflow file must be on the **default branch** (main) first
- Merge the governance PR, then create a new PR to trigger it
- Check Actions tab → "impl-provenance" workflow

### "GOVERNANCE_MESH_TOKEN" error
- Create a fine-grained PAT with read access to `alicenn-ucdenver-governance-mesh`
- Set it: `gh secret set GOVERNANCE_MESH_TOKEN --repo AliceNN-ucdenver/celeb-api`

### impl-provenance gate fails closed
- Expected on a hand-edited PR: there is no implementation-agent chain to verify
- The full signed chain is produced when the implementation agent runs against a fan-out landing issue (Step 8)
- Check the workflow logs in Actions for which evidence the gate reported missing

### Score too low — everything is restricted
- That's the point! Score 5 = restricted tier = maximum governance enforcement
- As you add security controls, architecture docs, etc., scores will rise and tier will relax

---

## Two-BAR Comparison

| | IMDB Lite Application | IMDB Celebs |
|---|---|---|
| Score | 90/100 | 5/100 |
| Tier | Autonomous | **Restricted** |
| Self-review rounds | Minimal (high trust) | **Maximum (Architect + Security, every round)** |
| impl-provenance gate | Verifies signed chain | Verifies signed chain (strictest path) |
| Hook Scope | Edit, Write, Bash | Edit, Write, Bash, **Read** |
| Agent Freedom | Implement freely | Plan first, implement after approval |

This contrast shows how Red Queen adapts governance pressure based on the maturity of each BAR.

---

## What's Next (Queen's Next Act)

- **Hard Enforcement Gate** — `redqueen-action` GitHub Action as required status check
- **Break-Glass Override** — Controlled bypass with CODEOWNER approval
- **Branch Protection** — Auto-configure required checks per governance tier
