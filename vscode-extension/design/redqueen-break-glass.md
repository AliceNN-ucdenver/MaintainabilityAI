# Red Queen Break-Glass — human-approved override for restricted-tier maintenance

> Status: ✅ **shipped + live-validated 2026-06-12** (S1 hook · S2 grant writer +
> dispatch · S2 UI + inline-dispatch break-glass · S3 auto-clear · TIER-003 Edit
> fix). Proven on celeb-api: a granted run flipped TIER-001/002 Write/Bash/Edit
> to audited `override:true / approvalSource:break-glass#<n>` while SEC-001 /
> CTRL-001 held. Surfaced 2026-06-12 from the Cheshire v2 Alice work — see
> [`cheshire-cat-maintenance-agent.md`](cheshire-cat-maintenance-agent.md).

## The problem

Alice (the Cheshire maintenance agent) is governed at the tool-call boundary by
the baked Red Queen policy + PreToolUse hook (`.redqueen/policy.json` +
`.redqueen/hooks/validate-tool.js`). The effective **tier** comes from the BAR's
composite score:

| Tier | Score | `toolRestrictions.deny` |
|---|---|---|
| autonomous | 80%+ | `[]` |
| supervised | 50–79% | `[]` |
| **restricted** | **<50%** | **`['Bash', 'Write']`** |

At **restricted** tier the hook hard-denies `Write` and `Bash` with **TIER-001**
([`config-scaffold.ts` `generateValidateToolJs`](../src/mcp/config-scaffold.ts)):

```js
if (tierRules.deny.includes(toolName)) {
  return { allowed: false, ruleId: 'TIER-001', reason: '… denied … get approval first.' };
}
```

This branch returns **before** any approval logic runs. So today a restricted
Alice can only `Edit` existing files (TIER-002, plan-approval) — she **cannot
create files or run tests/builds at all**, which is most real security +
maintenance work. A BAR is restricted precisely because it's low-maturity, but
blocking its security fixes makes it *less* secure. We need a **human-approved,
scoped, audited override** that lets a restricted BAR be remediated without
permanently lowering the bar.

## What already exists (verified in the generated hook)

- **Three approval signals**, each recorded as a **signed override event** in the
  Ed25519 audit chain (`override: true`, `bypassedRuleId`, `approvalSource`,
  `reason`):
  - `REDQUEEN_PLAN_APPROVED=true` (env) — bypasses restricted **Edit** (TIER-002)
    + requireApproval (TIER-003).
  - `REDQUEEN_TOOL_APPROVED=true` (env) — bypasses requireApproval only (TIER-003).
  - `toolInput.redqueenApproved=true` (per-call) — bypasses TIER-002 + TIER-003.
- **`bypassedRuleId` + `approvalSource` + `reason`** are already attributed onto
  the audit-log line for every override-allow.
- **PATH-001** (`DEFAULT_READ_ONLY_PATHS`: `.redqueen/**`, `.github/hooks/**`,
  `.mcp.json`, `.claude/**`, `AGENTS.md`) is a **non-overridable** hard deny at
  every tier — the agent can never write the governance harness itself.

**The gap:** TIER-001 (the restricted `Write`/`Bash` deny) has **no override
path**. This design adds one, reusing the existing override-recording machinery.

## Design

### 1. The grant: `.redqueen/approvals.json`

A human break-glasses a specific **issue**. The extension writes a signed entry
and commits it to the default branch (`main`) **before** dispatching Alice:

```jsonc
{
  "version": 1,
  "approvals": [
    {
      "issue": 42,                       // the GitHub issue # being remediated
      "tier": "restricted",              // tier at grant time (audit context)
      "grantedBy": "shawnmccarthy",      // GitHub login of the approver
      "grantedAt": "2026-06-12T16:00:00Z",
      "expiresAt": "2026-06-12T18:00:00Z", // TTL — default +2h
      "reason": "CodeQL SQLi fix in movieApi.ts",
      "sig": "ed25519:…"                 // optional v2 — see Forgery protection
    }
  ]
}
```

### 2. The flow (the ordering is load-bearing)

```
1. Human clicks "🔓 Break glass & assign Alice" on a restricted-tier issue #N
   (new issue → create first to get #N; existing issue → #N already known)
2. Extension commits .redqueen/approvals.json to main with { issue: N, …, expiresAt }
3. Extension posts an override comment on #N
   "🔓 Break-glass granted by @user at T, expires T+2h. Restricted-tier override
    (TIER-001) authorized for this remediation. Recorded in the audit chain."
4. Extension assigns Alice to #N (assignCustomCopilotAgent)
5. Alice branches off main → approvals.json is ALREADY in her working tree
6. Hook reads .redqueen/approvals.json, finds a valid active grant → flips the
   TIER-001 Write/Bash deny to ALLOW, records override:true,
   bypassedRuleId:'TIER-001', approvalSource:'approvals.json#N'
7. On #N's PR open/merge (or TTL expiry) → extension removes the grant entry
```

Because the grant is committed to `main` **before** the branch exists, it's
identical in Alice's branch → it **never appears in her PR diff**. And the
commit-then-assign order guarantees it's present at her first `Write`/`Bash`.

### 3. The hook change

In `generateValidateToolJs`, before the TIER-001 `return`, consult the active
break-glass. Two layers:

- **Base (always works, no branch needed):** honor the grant when there is
  exactly **one** active (unexpired) approval in `approvals.json`. Scope is
  enforced by **TTL + single-active + auto-clear-on-PR**, not by matching the
  session. Robust because the hook only reads a committed file from the tree.
- **Tightening (best-effort, when the runtime allows):** match
  `approval.issue === sessionIssue`. Resolve `sessionIssue` in priority order:
  1. an env var the Copilot Coding Agent exposes (e.g. `GITHUB_ISSUE_NUMBER` — to
     be **verified on a live run**; we don't yet know what it sets),
  2. the current branch name if it encodes the issue
     (`git rev-parse --abbrev-ref HEAD` → parse), unreliable so optional,
  3. the PR's `closingIssuesReferences` — **only available once the PR exists**,
     i.e. near the end of the run, so not usable during the work.
  When `sessionIssue` can't be resolved, fall back to the base layer.

> **Why the base layer leads:** the branch↔issue link a hook would want comes
> from the PR (`Closes #N`), which Alice opens at the END of her run — it isn't
> there while she's editing. So precise per-issue matching at the moment Write is
> first needed is not reliably available. TTL + single-active gives a sound scope
> without it; the issue-match is a tightening we switch on once we confirm the
> Copilot runtime hands us the issue.

### 4. Forgery protection

- **PATH-001 is the primary guarantee.** The agent can never `Write`/`Edit`
  `.redqueen/**`, so it cannot create or alter an approval. Its very first
  attempt to forge one is denied (non-overridable).
- **Committed-to-protected-main is the authorization.** A valid grant only
  exists because a human with write access committed it before the branch — the
  commit itself is the human-in-the-loop.
- **`sig` (v2, defense-in-depth):** Ed25519-sign each entry (reuse the
  Knight's Seal key material) so the hook can verify provenance even if PATH-001
  ever had a gap. Not required for v1.

### 5. Dashboard affordances (Security Scorecard)

After governance is deployed, `.redqueen/decision.json.effectiveTier` is known
(the governance section already reads it via `readGovernanceDecision`). Surface:

- A **tier badge** in the governance section — "Restricted — agent is plan-only".
- In the **maintenance-issues list**, restricted-tier rows show
  **"🔓 Break glass & assign Alice"** instead of plain "Assign Alice", with a
  confirm dialog ("grants a signed, time-boxed override for #N, logged in the
  audit chain").
- An **active break-glass chip** when a grant is open:
  "Break-glass active for #42 · expires in 1h 50m · granted by you · [Revoke]".

### 6. Safety properties

- **TTL** (default +2h) — auto-expires; the hook ignores expired grants.
- **Single-active** — at most one open break-glass; granting a second requires
  clearing/expiring the first. Unambiguously ties the grant to one dispatch.
- **Auto-clear** — remove the grant when #N's PR opens/merges (reuse the existing
  lifecycle hooks: merge → close issue → clear grant).
- **Budget (later — "Queen's Next Act")** — N break-glasses per epoch, so it's
  rationed, matching the planned "break-glass budgets + signed override events".
- **Fully audited** — every break-glassed tool call lands in the Ed25519 audit
  chain with `bypassedRuleId: TIER-001` + `grantedBy`; the override comment gives
  a human-readable trail on the issue.

## Open questions — verify on a live run before shipping the tightening

1. **Does the Copilot Coding Agent expose the issue number** to the tool-call
   environment (an env var the hook can read)? If yes → enable the precise
   per-issue match; if no → ship the base (single-active + TTL) only.
2. **Does Alice branch off the latest `main`** (so she inherits the just-committed
   grant)? The commit-then-assign order is designed for this, but confirm there's
   no race where the agent checks out before the grant commit lands.
3. **Branch naming** — does Copilot encode the issue in the branch
   (`copilot/<issue>-…`)? If stable, it's a cheap secondary `sessionIssue` source.

## Out of scope (v1)

- Cross-repo / multi-issue break-glass (single-active, single-repo for v1).
- Permanent tier changes — break-glass elevates for one task; raising the BAR's
  real tier is a separate governance act (improve the scores).
- The autonomous/supervised tiers — they don't hard-deny, so they need no
  break-glass (supervised security-critical edits already warn via SEC-002).

## Build slices (each independently shippable, gates green)

1. **Hook:** make TIER-001 approvable via an active `approvals.json` grant
   (base layer: TTL + single-active); record `bypassedRuleId:'TIER-001'`. Unit
   tests in `mesh-reader.test.ts` (deny without grant, allow with valid grant,
   deny with expired grant, deny when the agent forges via PATH-001).
2. **Extension:** `approvals.json` writer (commit-to-main) + override comment +
   the "Break glass & assign" action + active-chip/revoke on the Scorecard.
3. **Lifecycle:** auto-clear the grant on PR merge/close.
4. **Tightening (after live verification):** per-issue `sessionIssue` match.
5. **Hardening (later):** Ed25519 `sig` + per-epoch budget.
