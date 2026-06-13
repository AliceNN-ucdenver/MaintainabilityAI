# Part 7: The Red Queen's Court

<div class="docs-workshop-hero docs-workshop-rose">
  <div class="docs-workshop-number">7</div>
  <div>
    <div class="docs-card-kicker">Workshop Part 7 · The Red Queen's Court</div>
    <h2 class="docs-workshop-title">The Red Queen's Court</h2>
    <p class="docs-workshop-subtitle">Deterministic Enforcement. From Advisory Rules to Hard Gates with Audit Trails.</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> 90 minutes<br/>
    <strong class="docs-strong">Prerequisites:</strong> <a href="/docs/workshop/part6-team-prompt-library" class="markdown-link">Part 6 complete</a>. Prompt library versioned, Hatter's Tag landing on every PR, scorecard at ~55, repo in Supervised tier.<br/>
    <strong class="docs-strong">SDLC phase:</strong> Phase 4 (Governance) and a new agent-action enforcement layer.<br/>
    <strong class="docs-strong">Status:</strong> Available now
  </div>
</div>

> *"All the ways about here belong to me,"* says the Red Queen — she's the chess piece who rules the board, not the Queen of Hearts. By the end of Part 7 the celeb-api has the Red Queen installed: a PreToolUse hook blocks Bash and Write before they ever fire, an MCP `validate_action` call lets agents ask before they act, and the **same CALM-layer rule we built as a fitness function in Part 4 now runs deterministically at the agent's tool-call boundary instead of after the code is written**. The score finally lifts the Architecture pillar out of red, and the celeb-api crosses into Autonomous-tier readiness.

---

## What you will have built when you leave

1. The Red Queen scaffold added to the celeb-api: `.redqueen/` directory with `policy.json` (static rules), `mcp-runner.js` (live mesh resolution), and `hooks/validate-tool.js` + `.sh` (the fast-path PreToolUse hook).
2. `.claude/settings.json` updated with the PreToolUse hook registration so Claude Code calls into the validator on every tool use.
3. `.mcp.json` configured so Claude Code can call `validate_action` over MCP for richer, mesh-aware structural checks.
4. The `impl-provenance.yml` gate generated and configured as a **required status check** on the celeb-api's main branch. Implementation PRs cannot merge unless the signed audit chain, skill manifest, Hatter Tag, and Red Queen decision log all verify.
5. **A live demo of the hook firing.** You try to write a Mongo selector built directly from `req.body` in a route handler. The hook blocks it before the file changes. The deny reason cites the exact policy rule and lands as a JSONL line in the audit log.
6. **The Part 4 CALM-layer fitness function promoted to deterministic.** The advisory check that ran in CI in Part 4 now runs as a hook BEFORE the agent's edit lands. Same rule, two enforcement points, one fail-closed gate.
7. A custom team policy rule added: *"route handlers must validate Mongo input through a Zod schema; no `$where` / `$accumulator` / `$function`; no selector built from raw `req.body` / `req.query` / `req.params`."* Written once, enforced forever, audited every fire.
8. Scorecard: **~55 → ~65**. Architecture pillar finally lifts because the CALM-layer rule is now deterministic. The repo crosses the threshold for Autonomous-tier eligibility (the score earns it; remaining gaps are documented).
9. Golden Rule 6 internalised: **Make governance deterministic. Advisory rules become hard gates with audit trails.**

---

## Recap from Part 6

Part 6 finished the versioning + provenance layer. Every prompt pack now carries a SHA. Every AI-assisted PR carries a Hatter's Tag naming the pack, the model, the reviewer. The audit chain from *"we wondered"* to *"we shipped"* is one git query. The scorecard sits at ~55.

But **every rule we have written so far is still advisory.** A reviewer can override a fitness function failure by editing the workflow. An agent can ignore a prompt pack's checklist and still get a PR opened. The CALM-layer fitness function from Part 4 catches violations after the file is written, never before. Today we close the gap.

---

## Advisory vs deterministic. The architectural shift.

Through Part 6, governance worked like this:

```
Agent makes a change
        │
        ▼
Code lands on disk / in a PR
        │
        ▼
Fitness functions + scanners + human review CATCH problems AFTER they exist
        │
        ▼
Fix or reject
```

This is **after-the-fact** enforcement. It works for low-stakes work, but it has three structural weaknesses:

1. **The damage is already done.** If the bad code crossed into a security-critical path before the catch, the audit chain has a hole even if the PR is rejected.
2. **The gate is bypassable.** A reviewer with merge rights can override any advisory failure. The governance chain is only as strong as the person clicking Approve.
3. **The audit log records the violation, not the prevention.** *"PR #4187 was rejected because it violated CALM-004"* is weaker evidence than *"the agent attempted a CALM-004 violation, the hook blocked it before any change, the agent received the structured deny and routed correctly."*

Part 7 introduces **before-the-fact** enforcement:

```
Agent attempts tool call (Bash, Write, Edit)
        │
        ▼
PreToolUse hook fires. Runs in milliseconds.
        │
        ├──→ ALLOW: tool runs, change lands
        │
        ├──→ DENY: tool refuses, change never happens, audit logs the deny
        │
        └──→ CONDITIONAL (Edit on restricted tier): require recorded approval before proceeding
```

Same code, different position in time. The fitness function from Part 4 still runs in CI (catches anything the hook missed; useful for legacy code review). The Red Queen hook runs at the agent's tool-call boundary. The combination is **defense in depth at machine speed**.

### The three Red Queen control points (today, with a Queen&rsquo;s Next Act preview)

| Control point | When it fires | Latency | Bypassable? |
|---|---|---|---|
| **PreToolUse hook** | Before `Bash`, `Write`, `Edit` ever runs | <10 ms | `REDQUEEN_TOOL_APPROVED` (per tool call) or `REDQUEEN_PLAN_APPROVED` (per Edit on restricted-tier) — both logged |
| **MCP `validate_action`** | When the agent asks before acting (richer CALM/security checks) | <500 ms | The agent receives a structured verdict; ignoring it is itself an audited violation |
| **impl-provenance gate (required CI status check)** | After an implementation PR opens, before merge | 1-5 minutes (workflow run) | No, when configured as a branch-protection required check (the branch-protection setup is a manual step) |
| **`redqueen-action` standalone hard gate** *(<a href="/docs/red-queens-court#queens-next-act" class="markdown-link">Queen&rsquo;s Next Act</a>)* | At the PR merge boundary, non-bypassable | AST semantic diff + contract diffs | No |

Today we ship the first three. Queen&rsquo;s Next Act adds the standalone `redqueen-action` hard gate plus AST semantic diff and contract diffs.

---

## The agentic shift

In 2024, governance was a code review at the end. A human read the diff, decided if the AI made sense, merged or not. In 2026-2027, governance is **enforced at the agent's tool-call boundary**. The agent literally cannot violate the architecture without an explicit, recorded, time-limited override.

This is what "the trust battery earns autonomy" actually means. A repo at score 5 (Restricted) has hooks that block everything. A repo at score 70 (Supervised, where the celeb-api will be by the end of today) has hooks that block only the most dangerous patterns. A repo at score 85+ (Autonomous) has hooks that block almost nothing but log everything. **The score gates the autonomy; the hooks enforce the gate.**

---

## Walkthrough: install the Red Queen and watch it fire

This is a hands-on part. Budget 60 minutes for the install + first hook demo + custom rule.

### Step 1. Scaffold the Red Queen governance files

Open the celeb-api in VS Code. Click the **Cheshire Cat** icon → **Scaffold SDLC → Add Red Queen governance**.

The panel asks you to confirm:
- Mesh path (auto-detected if `RED_QUEEN_MESH_PATH` is set in your env)
- BAR: `APP-IMDB-002`

Click **Scaffold**. Cheshire writes:

```
.redqueen/
  policy.json              ← static tier + path + CALM rules, pre-computed from the mesh
  decision.json            ← orchestration decision (tier + permissions + active rules)
  governance-context.md    ← human-readable summary of governance posture
  config-manifest.yaml     ← scaffold version + file fingerprints for the doctor
  mcp-runner.js            ← Node script that launches the Red Queen MCP server
  hooks/
    validate-tool.js       ← the fast-path policy evaluator (pure JavaScript)
    validate-tool.sh       ← shell wrapper that PreToolUse calls
.claude/
  settings.json            ← updated with the PreToolUse hook registration
.mcp.json                  ← Claude Code MCP server config pointing at .redqueen/mcp-runner.js
.github/
  hooks/redqueen.json      ← Copilot Coding Agent governance config (Copilot hook adapter)
  copilot-governance-steps.yml  ← Copilot pre-run governance steps
  workflows/
    impl-provenance.yml    ← always-on gate verifying the signed audit chain on implementation PRs
AGENTS.md                  ← updated to declare Red Queen is the governance authority
```

Commit. The celeb-api repo now has the full Red Queen scaffold.

### Step 2. Read the policy.json

```bash
cat .redqueen/policy.json
```

You should see something like:

```json
{
  "barId": "APP-IMDB-002",
  "barName": "IMDB Celebs (celeb-api)",
  "tier": "supervised",
  "compositeScore": 55,
  "rules": {
    "toolRestrictions": {
      "restricted": { "deny": ["Bash", "Write"], "requireApproval": ["Edit"] },
      "supervised": { "deny": [], "requireApproval": ["Bash"] },
      "autonomous": { "deny": [], "requireApproval": [] }
    },
    "securityCriticalPaths": ["src/auth/**", "src/crypto/**", "**/*secret*", "**/*credential*"],
    "readOnlyPaths": [".mcp.json", ".claude/**", ".redqueen/**"],
    "allowedConnections": [
      { "source": "celeb-frontend", "target": "celeb-api",  "relationshipId": "frontend-to-api" },
      { "source": "celeb-api",      "target": "celeb-db",   "relationshipId": "api-to-db" },
      { "source": "celeb-api",      "target": "news-feed",  "relationshipId": "api-to-news" }
    ]
  }
}
```

Three things to notice:

1. **The tier is `supervised`**, pulled from the current scorecard. The policy auto-derives the tier; you do not configure it manually.
2. **`allowedConnections`** lists every flow declared in the BAR's CALM model. **A code change that proposes an undeclared connection (frontend → celeb-db directly, celeb-api → any node the CALM model has not authorised) is denied.**
3. **`readOnlyPaths`** includes the Red Queen's own files. Agents cannot edit the policy that governs them. The governance is itself governed.

### Step 3. Read the hook

```bash
cat .redqueen/hooks/validate-tool.js | head -40
```

Pure JavaScript. Reads `.redqueen/policy.json`. Checks the tool name + file path + (when relevant) the source / target nodes for CALM connection proposals. Returns `{ allowed, reason }` JSON.

The shell wrapper (`validate-tool.sh`) calls `node validate-tool.js` and translates the JSON verdict into Claude Code's hook exit-code protocol (exit 0 = allow, exit 1 = deny).

### Step 4. Trip the hook on purpose

Try to write a Bash command that violates a tier rule. From Claude Code, in the celeb-api workspace:

```
Please run `rm -rf node_modules` for me.
```

What you should see (in Claude Code's output):

```
[Red Queen] PreToolUse hook ran in 7ms.
Tool: Bash
Verdict: requireApproval (Bash on supervised-tier BAR)
Decision: Plan first. Set REDQUEEN_TOOL_APPROVED=true after recording approval.

Tool call cancelled.
```

The Bash never ran. The deny is logged to `.redqueen/audit-log.jsonl`. Claude Code receives the structured reason and can plan around it (e.g., propose the Bash, ask you to confirm out-of-band, then re-attempt with approval recorded).

> Two different break-glass env vars. `REDQUEEN_TOOL_APPROVED=true` bypasses a single `requireApproval` verdict (the case above). `REDQUEEN_PLAN_APPROVED=true` is narrower: it permits a single Edit on a restricted-tier BAR after a written plan. Use the tighter one whenever it applies.

### Step 5. Trip the CALM connection rule

This is the demo that ties Parts 4 and 7 together. Try to make the AI write code that violates the BAR's declared architecture:

In your editor, ask Claude Code:

```
Please add a new endpoint to celeb-api that pulls a real-time trending list
straight from the analytics-warehouse so we can sort celebrities by
yesterday's view count.
```

The CALM model does **not** declare `celeb-api → analytics-warehouse`. The Red Queen will deny:

```
[Red Queen] CALM-004: No declared CALM relationship permits
celeb-api → analytics-warehouse.
Update bars/APP-IMDB-002/bar.arch.json to add the new flow first, or route
through a declared interface.

Tool call cancelled. The change was never written to disk.
```

This is the same rule Part 4's CALM-layer fitness function would catch. But the fitness function fires in CI after the file is written; the Red Queen fires before the file is touched. **The bad change literally never happens.**

### Step 6. The MCP `validate_action` call

The hook is fast and binary (allow / deny). For richer queries the agent can call the `validate_action` MCP tool. From Claude Code:

```
Before I propose changes, can you check whether adding a new endpoint
`/celebrities/:id/movies` that joins celeb-api + movie-api data is
architecturally valid?
```

Claude calls `validate_action` over MCP. The runner reads the full CALM model, evaluates the proposed action, returns:

```json
{
  "verdict": "conditional",
  "violations": [{
    "ruleId": "CALM-002",
    "category": "calm_flow",
    "severity": "warning",
    "message": "Cross-BAR data composition (APP-IMDB-001 movies + APP-IMDB-002 celebrities) creates platform coupling",
    "details": "Consider an explicit composition layer or document with an ADR before implementation"
  }],
  "reasoning": ["BAR: APP-IMDB-002, Tier: supervised", "Cross-platform read detected", "CONDITIONAL: 1 warning"],
  "conditions": ["Cross-BAR data composition creates platform coupling"]
}
```

The agent now has a structured signal. It knows the change is *allowed* but needs an ADR. It can ask you to write the ADR before proceeding, or propose the ADR itself for your review.

### Step 7. Promote the CALM-connection fitness function to deterministic

The fitness function we wrote in Part 4 reads `bars/APP-IMDB-002/bar.arch.json` and asserts that proposed connections match the declared CALM flows. Today the Red Queen runs the same check at hook time over `.redqueen/policy.json → allowedConnections`. Any code change that proposes an undeclared connection (frontend → db, anything → analytics-warehouse that the BAR did not declare) fires `CALM-004` and is denied before the file is touched. The deny lands as a JSONL line in `.redqueen/audit-log.jsonl` with `ruleId: CALM-004`, the tool, the file path, the agent (`claude` or `copilot`), and the session ID, so the deny is grep-able later (`jq 'select(.payload.ruleId == "CALM-004")' .redqueen/audit-log.jsonl`).

Re-test by asking the agent to introduce a new route in `src/routes/celebrity.ts` that opens a connection to a node the CALM model does not declare. The hook denies:

```
[Red Queen] CALM-004: No declared CALM relationship permits
celeb-api → analytics-warehouse.
Update bars/APP-IMDB-002/bar.arch.json to add the new flow first, or route
through a declared interface.
```

**The Part 4 fitness function still runs in CI as a safety net** for legacy commits and for any code path the hook does not cover (e.g., direct file edits outside the agent). The hook is the primary gate; the fitness function is the secondary one. Defense in depth.

> Per-file layer enforcement (route-must-not-import-data, semantic import graph walking) is part of <a href="/docs/red-queens-court#queens-next-act" class="markdown-link">Queen's Next Act</a>. The scaffold today writes the connection-level walker, not the per-file import walker.

### Step 8. Add a custom team rule

Your team wants every Mongo query in route handlers to validate the request through a Zod schema before it touches the driver. Today the OWASP A03 prompt pack requires it, the fitness function flags raw selectors and `$where`/`$ne`/`$regex` operators built from user input as violations, but neither **blocks** the agent from writing them. NoSQL injection in Mongo happens when an attacker controls the *shape* of a selector ({ password: { $ne: null } }, { $where: "this.role == 'admin'" }, unbounded regex), not just its values.

Open `.redqueen/policy.json`. Under `rules`, add:

```json
"customRules": [
  {
    "id": "SEC-101",
    "category": "security",
    "severity": "error",
    "appliesTo": ["src/routes/**/*.ts"],
    "denyPattern": "(?:\\$where|\\$accumulator|\\$function)|\\.find\\(\\s*req\\.(?:body|query|params)|\\.findOne\\(\\s*req\\.(?:body|query|params)",
    "message": "Route handlers must validate request input with a Zod schema (rejecting keys starting with $) before passing it to a Mongo selector. Detected raw $where/$accumulator/$function or selector built directly from req.body/query/params."
  }
]
```

Save the file. The scaffold ships the `customRules` walker in `.redqueen/hooks/validate-tool.js` by default (since v0.13.3), so no hook code changes are needed: the walker iterates `rules.customRules` on every Edit / Write / Bash, tests `denyPattern` against the proposed file content (`new_string` for Edit, `content` for Write, `command` for Bash) when the target file path matches one of the `appliesTo` globs, and denies on first hit. Pathological regex compile errors are logged to stderr and the rule is skipped, so a bad team rule never crashes the hook.

Test by asking the agent to write code with `await Celebrities.find(req.body)`. Denied with `[Red Queen] SEC-101: Route handlers must validate ...`. Ask it with `const input = celebQuerySchema.parse(req.body); await Celebrities.find(input.selector)`. Allowed.

**Write the rule once. It fires at machine speed forever. Every fire is logged to `.redqueen/audit-log.jsonl`** with `ruleId: SEC-101`, the file path, and the session ID. That is the deal.

### Step 9. Make the impl-provenance gate a required status check

Generated workflow `impl-provenance.yml` runs on every implementation PR. It verifies the signed audit chain, skill manifest, Hatter Tag, and Red Queen decision log, but it does not block merges until you mark it as a required check. In your celeb-api repo settings:

```bash
gh api repos/$OWNER/celeb-api/branches/main/protection \
  --method PUT \
  --field 'required_status_checks[strict]=true' \
  --field 'required_status_checks[contexts][]=impl-provenance' \
  --field 'enforce_admins=true' \
  --field 'required_pull_request_reviews[required_approving_review_count]=1' \
  --field 'restrictions=null'
```

Now `impl-provenance.yml` is a hard merge gate. Any implementation PR whose signed chain does not verify (missing evidence, broken chain, policy violation) cannot be merged, even by admins. The implementation agent's embedded Architect + Security self-review supplies the review judgment the gate then verifies — no separate reviewer-bot court is dispatched.

### Step 10. Re-read the scorecard

Refresh the Cheshire Cat Security Scorecard. You should see:

```
celeb-api                                 66 / 100      SUPERVISED  (up from 55)
  Code Security                           19 / 25       green
  Test Coverage                           14 / 20       green
  Technical Debt                           8 / 15       yellow
  Dependency Freshness                    10 / 15       green
  Complexity                               5 / 15       yellow
  Architecture                            10 / 10       green   ← CALM rule now deterministic
```

The Architecture pillar finally lifts to green. The composite score crosses into Autonomous-tier readiness territory (>=80 is the formal threshold; remaining gaps are in Technical Debt and Complexity, which are about code state, not about governance enforcement).

The repo is not in Autonomous tier yet. The tier is derived from the composite. But the governance enforcement layer that an Autonomous-tier repo needs is **now in place**. The remaining ~15 points are cleanup work.

---

## Q&amp;A

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 1. What is the difference between a Part 4 fitness function and a Part 7 Red Queen hook? They look like they check the same things.</summary>

They check overlapping rules at different *positions in time*. Same code, same architectural intent, different enforcement point.

- **Fitness function (Part 4)** runs in CI, after the agent has written the code. Catches violations on the way to merge. Useful for any path the hook doesn't cover (direct human edits, edits in a different agent that doesn't honor the hook, legacy code that pre-dates the policy). Advisory: a team can disable the gate.
- **Red Queen hook (Part 7)** runs at the agent's tool-call boundary, before the write happens. The bad change literally never lands on disk. Faster feedback for the agent. Non-bypassable for tools that honor PreToolUse (Claude Code today; Copilot Coding Agent via parallel mechanism).

The right pattern is **both**. Hook catches the agent before the change. Fitness function catches anything that bypasses the hook. Defense in depth. Same rule expressed in two enforcement points; one policy.json is the source of truth.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 2. What about emergencies? Production is on fire and I need to push a fix that violates a rule.</summary>

Break-glass override. Three properties make it safe.

**Scoped.** Two different env vars cover two different cases. `REDQUEEN_TOOL_APPROVED=true` bypasses one `requireApproval` verdict (most tool calls). `REDQUEEN_PLAN_APPROVED=true` is narrower: it permits a single Edit on a restricted-tier BAR after a written plan. Neither silences the hook for future calls.

**Time-limited.** The override is per-session. A new agent session re-reads policy.json from scratch.

**Recorded.** Every override the hook honors is recorded in `.redqueen/audit-log.jsonl` with `action: pre_tool_use`, `verdict: allow`, **`override: true`**, **`bypassedRuleId`** (which rule the approval bypassed, e.g. `TIER-001` for a Restricted Write/Bash, `TIER-002` for a Restricted Edit, `TIER-003` for a requireApproval Bash), and **`approvalSource`** (`REDQUEEN_TOOL_APPROVED`, `REDQUEEN_PLAN_APPROVED`, `toolInput.redqueenApproved`, or `break-glass#<issue>` for a committed grant). The audit log is grep-able. *"How many TIER-003 overrides last quarter?"* is one `jq` query (`jq 'select(.payload.override == true and .payload.bypassedRuleId == "TIER-003")' .redqueen/audit-log.jsonl`), not an archaeology session.

> **Two break-glass paths ship today.** The **env-var** path above (`REDQUEEN_TOOL_APPROVED` / `REDQUEEN_PLAN_APPROVED`) is the in-the-loop, per-session lever for a developer at the keyboard. For **dispatching an agent** on a Restricted-tier repo — where Write/Bash/Edit are denied outright — the Cheshire Scorecard has a one-click **🔓 Break glass** that grants a *scoped, time-boxed* override for a single issue: it commits a record to `.redqueen/approvals.json` capturing **who** approved it, **why**, and **when it expires** (a TTL, auto-cleared on merge), and the hook honors it as `approvalSource: break-glass#<issue>`. That grant file is itself in `readOnlyPaths`, so the agent **can't forge its own** — only a human commit mints one, and security-critical paths (`SEC-001`) stay denied even under the grant. Validated end-to-end on a Restricted repo (celeb-api). What remains for <a href="/docs/red-queens-court#queens-next-act" class="markdown-link">Queen's Next Act</a>: per-epoch override **budgets**, CODEOWNER **co-signing** for sensitive areas, and **signing the grant record** itself (Ed25519, tying engineer identity into the same evidence chain).

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 3. Does this work with GitHub Copilot Coding Agent, or only Claude Code?</summary>

Both, via different mechanisms.

**Claude Code** honors the PreToolUse hook protocol (`.claude/settings.json` registration calls into `.redqueen/hooks/validate-tool.sh`). The hook denies; the tool does not run. This is the cleanest integration today.

**Copilot Coding Agent** runs in its own ephemeral GitHub Actions container. The Red Queen's enforcement for Copilot happens via the `.github/hooks/redqueen.json` config (Copilot Coding Agent reads this on session start) plus the `impl-provenance.yml` required status check (which prevents any implementation PR from merging unless its signed audit chain verifies). The Copilot path is more workflow-driven than hook-driven, but the policy.json is shared. Both agents are governed by the same rules.

Cheshire's scaffold generates both hook mechanisms. If your team is Copilot-only, you still get all of Part 7's value; the latency profile is different (CI-time vs hook-time) but the rules and the audit are the same.

</details>

---

## Try it yourself: write a custom rule that matters to your team

You wrote `SEC-101` together. Now write one of your own that addresses a real pattern in the celeb-api.

### Suggested rules

- **`OPS-101`**: forbid `console.log` in `src/routes/**/*.ts` (force structured logging via the team's logger module)
- **`DATA-101`**: forbid `JSON.parse` on user input without a Zod schema reference in the same file (catches unvalidated parse-then-trust patterns)
- **`SEC-102`**: forbid hardcoded URLs to external services in `src/services/**` (force env-var configuration)

### What to write

1. Open `.redqueen/policy.json` and add a new entry to `customRules`.
2. Each rule needs: `id`, `category`, `severity`, `appliesTo` (glob patterns), `denyPattern` (regex), `message`.
3. Test by asking the agent to introduce the pattern. The hook should deny.
4. Add a one-line entry to the BAR's ADRs (`bars/APP-IMDB-002/adrs/`) explaining the rule's intent so future maintainers know why it exists.

### Check your work

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work</summary>

The discipline behind good Red Queen rules:

- **The rule has a written rationale (an ADR).** Without it, future engineers see the deny and think the rule is arbitrary. With it, they understand why and can propose changes through the normal architecture-decision process.
- **The regex is narrow.** A rule that fires too broadly trains the team to override it. A rule that fires precisely on a real bad pattern earns trust.
- **The severity matches the impact.** `error` means *this never ships*. `warning` means *think before you proceed*. Reserve `error` for the patterns that would cause an actual incident.
- **The rule is testable.** Write a regression test in the fitness function harness that asserts the rule fires on the bad pattern. If the hook breaks (your regex was wrong, the rule got disabled), the test catches it.

The chief-trainer test for any custom rule: *if I am on call at 2 AM and the rule blocks my fix, can I read the ADR and the error message and immediately understand what is being protected?* If yes, the rule is well-designed. If no, the rule is going to be overridden the first time it inconveniences someone.

</details>

---

## What you learned

- **Advisory vs deterministic enforcement** is a position in time. Advisory rules catch violations after they happen; deterministic rules prevent them from happening. Both have their place; combining them is defense in depth.
- **The Red Queen ships three control points today:** PreToolUse hook (fast, binary, <10ms), MCP `validate_action` (richer, structured, <500ms), and `impl-provenance.yml` as a required status check (CI-time, verifies the signed audit chain produced by the implementation agent's embedded self-review). A dedicated standalone hard gate (`redqueen-action`) is Queen's Next Act.
- **The same CALM rule can run at multiple enforcement points.** The Part 4 fitness function and the Part 7 hook are the same rule expressed at different positions in the lifecycle. One policy.json is the source of truth.
- **Break-glass is scoped, time-limited, and attributable.** Two paths: `REDQUEEN_TOOL_APPROVED=true` / `REDQUEEN_PLAN_APPROVED=true` let a developer through one tool call or one planned Edit, logged with `override: true`, `bypassedRuleId`, `approvalSource`, and the session ID. For a **dispatched agent** on a Restricted repo, the Scorecard's one-click **🔓 Break glass** commits a scoped, time-boxed grant to `.redqueen/approvals.json` that records **who/why/expiry** and is honored as `approvalSource: break-glass#<issue>` — the grant file is read-only to the agent (it can't forge one) and `SEC-001` paths stay denied even under it. Per-epoch budgets, CODEOWNER co-signing, and **signing the grant record** are Queen's Next Act.
- **The governance is itself governed.** `.redqueen/` files are in `readOnlyPaths`. Agents cannot edit the policy that governs them.
- **Custom rules are how teams encode "we do not do it that way."** Written once in `policy.json -> rules.customRules`, walked at machine speed by the v0.13.3+ scaffold-generated hook, logged every fire with `ruleId` + tool + path. The team's institutional memory becomes deterministic enforcement.
- **The tier earns the autonomy.** A Restricted-tier repo's hooks block almost everything; an Autonomous-tier repo's hooks block almost nothing but log everything. The score is the lever. Improving the score (the work we have been doing across the whole workshop) is how the agent earns more freedom.
- **Both Claude Code and Copilot Coding Agent are governed.** Different hook mechanisms (Claude reads `.claude/settings.json` PreToolUse; Copilot reads `.github/hooks/redqueen.json`), shared `policy.json`. Both agents' enforcement decisions write into the same `.redqueen/audit-log.jsonl` on the repo. Unifying that with the Hatter's planning-side hash-chained audit log is Queen's Next Act.

---

## The Golden Rule for this part

> **Rule 6. Make governance deterministic. Advisory rules become hard gates with audit trails.**
>
> A rule that is only a suggestion is a rule that someone will skip under deadline pressure. A rule that fires at machine speed and refuses the action that would violate it is a rule that survives the team's worst Tuesday. The audit log (every allow, every deny, every override) is what makes the enforcement defensible to an auditor and trustworthy to the engineers operating inside it. Today that log lives in `.redqueen/audit-log.jsonl`; the unified, signed, verifier-checked evidence chain across both Hatter and Red Queen sides is Queen's Next Act. The agentic SDLC's leverage at the boundary between advisory and deterministic is what separates *"we wrote good rules"* from *"the rules are how the system actually works."*

This is the last Golden Rule. Part 8 does not introduce a new one; it shows how the six combine.

---

## What is next: Part 8 — Through the Looking Glass

The celeb-api now has every layer: prompt packs (Part 2), live remediation (Part 3), fitness functions (Part 4), scanners (Part 5), versioned prompts with Hatter's Tag (Part 6), and deterministic policy enforcement (Part 7). Part 8 is the capstone. You ship **one cross-cutting feature** across all four IMDB-lite repos with the complete evidence chain attached. Every Golden Rule is exercised. Every artifact connects to the next. The auditor sees the whole chain from *"we wondered"* to *"we shipped"* in one git query.

Scorecard goal for Part 8: **~65 → ~80**. The celeb-api crosses into Autonomous tier.

[Continue to Part 8 →](/docs/workshop/part8-governance-capstone)
