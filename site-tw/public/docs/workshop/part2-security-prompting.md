# Part 2: Cheshire's Prompt Pack

<div class="docs-workshop-hero docs-workshop-emerald">
  <div class="docs-workshop-number">2</div>
  <div>
    <div class="docs-card-kicker">Workshop Part 2 · Cheshire's Prompt Pack</div>
    <h2 class="docs-workshop-title">Cheshire's Prompt Pack</h2>
    <p class="docs-workshop-subtitle">Why RCTRO, why OWASP, why STRIDE, why Maintainability. The contracts your agents read.</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> 60 minutes<br/>
    <strong class="docs-strong">Prerequisites:</strong> <a href="/docs/workshop/part1-spectrum" class="markdown-link">Part 1 complete</a>. Extension installed, IMDB Lite seeded, <code>celeb-api</code> scaffolded (scorecard ~5/100, Restricted tier).<br/>
    <strong class="docs-strong">SDLC phase:</strong> Phase 1 (Design contracts).<br/>
    <strong class="docs-strong">Status:</strong> Available now
  </div>
</div>

> Part 2 is the theory class. No agent fires yet. By the end you will understand the **RCTRO** pattern in depth, know why the three pack families (OWASP, STRIDE, Maintainability) each exist and when each one applies, and have written your first RCTRO for a brand-new feature using the actual packs scaffolded into the celeb-api in Part 1. The agent goes to work in Part 3.

---

## What you will have built when you leave

1. A clear definition of **why** generic prompts fail and **how** RCTRO closes the gap.
2. Familiarity with the **three pack families** (`.cheshire/prompts/owasp/`, `/stride/`, `/maintainability/`) and the rule of thumb for when to reach for each.
3. A hand-drafted RCTRO for the **"Add Celebrity Favorites"** feature, using five real prompt packs as inputs. Not a fix. A *new feature*. This is what your day looks like in 2026-2027.
4. Comparison of your hand-drafted RCTRO against the one Cheshire generates from the same plain-English description, so the value of the packs is concrete, not theoretical.
5. Golden Rule 2 internalised: **Write the full contract before asking for code.**

---

## Recap from Part 1

The celeb-api scored 5/100 because nothing was governed. We scaffolded it with Cheshire. The repo now ships with `.github/workflows/codeql.yml`, `.github/workflows/codeql-to-issues.yml`, `.github/workflows/alice-remediation.yml`, and a `.cheshire/prompts/` directory pre-populated with OWASP, STRIDE, and Maintainability packs. Part 2 is the part of the class where we open those packs and learn the language they speak.

---

## Why security-first prompting

Teams discover the cost of a bad prompt the second time they read the diff. A prompt like *"add a search endpoint to the celeb-api"* will produce something. It will almost always:

- Concatenate the query parameter into SQL because the agent saw a Stack Overflow answer doing that.
- Skip input validation because nothing in the prompt said "validate".
- Return verbose error messages because nothing said "do not leak the schema".
- Add no tests because no acceptance criteria existed.

Now the human reads the PR and either rejects it (slow), or merges it (worse). Both outcomes happen because **the prompt was the bug**.

Security-first prompting flips this. The constraints arrive *with* the request, in a structure agents have been trained to follow. The agent is no longer guessing what good looks like, because good is written down.

---

## The RCTRO pattern

Every prompt that ships to an agent in this workshop has five sections. Memorise these.

| Section | What it answers | Worked example: "add celebrity favorites" |
|---|---|---|
| **Role** | Who the agent is pretending to be, and why that frame matters | "Senior full-stack engineer adding a per-user persistence feature to a Restricted-tier BAR." |
| **Context** | Where the work happens, the surrounding system, which packs apply | "Repos touched: `celeb-api` (new endpoint + table), `imdb-identity` (read user ID from JWT), `imdb-react-frontend` (favorite button + favorites page). CALM flow stays: `frontend → celeb-api → celeb-db`, `frontend → imdb-identity → identity-db`. Applicable packs: A01, A03, A09, complexity, DRY." |
| **Task** | What concretely needs to happen, in one sentence | "Implement per-user favoriting of celebrities, persisted in `celeb-db.celebrity_favorites(user_id, celebrity_id)`, exposed through `POST/DELETE/GET /celebrities/:id/favorite` on celeb-api." |
| **Requirements** | The machine-checkable constraints. Most of these come from the packs. | (See below: the packs supply this section) |
| **Output** | What files, what shape, what doesn't change | "New routes, new validator, new migration, new tests. No changes to `imdb-identity` beyond JWT verification middleware. Frontend uses existing API client. PR labelled `🤖 AI-assisted · A01 · A03 · A09`." |

Every line is a guardrail. Skip Context and the agent invents an architecture. Skip Requirements and the agent invents acceptance criteria. Skip Output and you get five files where you wanted three.

What you should notice: writing Role, Task, and Output by hand is reasonable for a small feature. **Writing Requirements by hand for any feature touching three OWASP categories is unreasonable.** That is where the packs come in.

---

## The three pack families

Cheshire ships with three families of prompt pack. They are not interchangeable. Each one answers a different question.

### OWASP packs (`.cheshire/prompts/owasp/`)

**Question they answer:** *what known attacks does this code surface, and how do I close them?*

Ten files, one per OWASP Top 10 category, named after the canonical ID: `A01_broken_access_control.md`, `A02_crypto_failures.md`, all the way through `A10_ssrf.md`. Each file is a reusable Role + Context skeleton plus a long Requirements checklist that any fix or feature in that category should satisfy. Parameterised queries, allowlist validation, generic errors, attack-vector tests, the lot.

**When you reach for them:** any time the work touches a category. New endpoint that takes user input? A03. Anything with authentication? A07. Anything with a redirect parameter? A10. The mapping is mostly mechanical, which is good, because it means the agent can do it too once Cheshire is wired up.

### STRIDE packs (`.cheshire/prompts/threat-modeling/`)

**Question they answer:** *before this exists, what could an attacker do with it?*

Six files, one per STRIDE category: `spoofing.md`, `tampering.md`, `repudiation.md`, `information-disclosure.md`, `denial-of-service.md`, `elevation-of-privilege.md`. These are **design-time** packs. You reach for them *before* code exists, when the feature is still an architecture diagram and a JIRA ticket.

OWASP is "what known bugs". STRIDE is "what could an adversary do here, even if no known bug applies". The first is a *catalogue of solutions*. The second is a *frame for asking questions*. A mature team uses both.

**When you reach for them:** before any new endpoint that handles trust, identity, money, or PII. Before any new cross-service call. Before any change to the CALM model. The output is usually a new Requirements section in the RCTRO with mitigations the OWASP packs do not have.

### Maintainability packs (`.cheshire/prompts/maintainability/`)

**Question they answer:** *will the next engineer (or the next agent) be able to work on this in six months without cursing my name?*

Eight files: `fitness-functions.md`, `complexity-reduction.md`, `dry-principle.md`, `single-responsibility.md`, `dependency-hygiene.md`, `technical-debt.md`, `strangler-fig.md`. These do not catch attacks. They catch the *erosion* that makes attacks easier later.

**When you reach for them:** every feature. Always at least `complexity-reduction.md` and `single-responsibility.md`. Often `dry-principle.md` if the feature might duplicate existing logic. We use the whole family in Part 4 to generate fitness functions.

### The rule of thumb

| If the work is… | Reach for… |
|---|---|
| A bug fix for a known vulnerability class | OWASP pack for that class |
| A new feature touching trust or data | STRIDE *before*, OWASP *during*, Maintainability *always* |
| A refactor or cleanup | Maintainability packs only |
| A new cross-repo flow | STRIDE first. The OWASP categories follow from the threats. |
| A scanner finding (CodeQL, Snyk) | Cheshire picks the OWASP pack for you from the finding's category |

---

## The agentic shift

In 2024, a prompt was personal. A developer wrote it, kept it in chat history, threw it away when the task was done. There was no audit trail of *which prompt produced which code*.

In 2026-2027 prompts are versioned assets. They live in `.cheshire/prompts/`. They are code-reviewed. They appear by reference in PR descriptions (the **Hatter's Tag** preview in Part 6). When an auditor asks *"how did this PR come into being"*, the answer is a git SHA pointing to a prompt pack version, the CodeQL finding ID or JIRA ticket, an agent invocation log, and a human reviewer.

The prompt is the contract. The agent reads it. The auditor reads it. The next engineer reads it.

---

## Walkthrough: prompt packs guiding a brand-new feature

Most demos of AI-assisted development show *fixing* code. We will fix code in Part 3. Today we show what a pack-driven flow looks like for a feature that does not exist yet, because that is where the leverage really is.

The feature: **"Add Celebrity Favorites" to the IMDB Lite app.** A signed-in user can favorite a celebrity, see their favorites list, and unfavorite. Touches all three backend repos plus the frontend. This is the Part 8 capstone in miniature.

### Step 1. Draft the RCTRO by hand (10 minutes, on paper)

Before opening Cheshire, work in pairs. Draft an RCTRO for "Add Celebrity Favorites". Five sections. Aim for one paragraph in Role and Task, three or four bullets in Context and Output, and **whatever you can think of for Requirements**.

The point of doing this by hand is to see, in real time, how much harder Requirements is than the other four sections. Your Requirements list will have maybe eight bullets if you are senior, four if you are not. Auth, validation, tests, error messages, idempotency. Most teams stop there.

### Step 2. Now open Cheshire and run the same feature through it

In VS Code, click **Cheshire Cat → Issue Management → New Feature**. Paste the same plain-English description:

> Add per-user favoriting of celebrities. Signed-in user can POST to favorite, DELETE to unfavorite, and GET their list. Frontend gets a favorite button on the celebrity detail page and a favorites page.

Cheshire scans the description and proposes packs to include. For this feature it should suggest:

- `owasp/A01_broken_access_control` (per-user data, IDOR and ownership checks)
- `owasp/A03_injection` (new DB writes, parameterised queries, validation)
- `owasp/A09_logging_monitoring` (auth events, log who favorited what, when, no PII)
- `maintainability/complexity-reduction` (keep new functions under CC 10)
- `maintainability/dry-principle` (favorite/unfavorite share validation and ownership logic)

Accept those five. Click **Generate RCTRO**. Cheshire produces a full RCTRO body with each pack's checklist expanded inline under Requirements.

### Step 3. Compare

Look at the Requirements section Cheshire produced. Count the bullets. It will be in the range of 25 to 40, depending on how much each pack contributed. **Your hand-drafted version had four to eight.** That is the gap.

What Cheshire added that you probably missed:

- A01: ownership check on every endpoint, not just POST. Deny-by-default. Logging of denied attempts.
- A03: parameterised inserts AND parameterised deletes. Zod schemas for path params, not just bodies. Tests with SQLi payloads in `:id`.
- A09: structured log event names (`favorite.added`, `favorite.removed`), no celebrity name in the log line (PII risk), user ID hashed in the event ID.
- Complexity: maximum cyclomatic complexity 10 per function, including the validator middleware.
- DRY: shared `assertUserOwnsFavorite` helper, no copy-pasted ownership logic in three endpoints.

That is the value of the pack. It is not that the agent could not work without it. It is that the agent and the human are now working from **the same checklist**, and that checklist is the institutional memory of every team that came before you.

### Step 4. Do not assign the agent yet

We are not going to invoke the agent on this feature today. Two reasons:

1. **It is a Stage 3 feature** (agentic, cross-repo, three services, frontend included) and the celeb-api is in Restricted tier. The hooks we install in Part 7 would block it. The right thing to do is wait until the score lifts.
2. **The capstone in Part 8 ships this feature** with the full evidence chain. We are pre-walking the contract today so Part 8 is not the first time you see this RCTRO.

Save the RCTRO Cheshire generated. We will come back to it.

---

## Q&amp;A

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 1. The pack checklists look long. Will agents actually read them, or do they hit context limits and silently truncate?</summary>

Modern agents (Claude Opus, Sonnet 4.6, Copilot Coding Agent on GPT-5) handle 200K+ tokens of context. The Cheshire RCTRO for the favorites feature, with all five pack checklists expanded, comes in around 6,000 tokens. That is well within the budget.

What you *should* worry about is the agent **acknowledging** the constraints versus **applying** them. This is why the alice-remediation workflow runs in two phases: a planning phase where the agent restates the Requirements and writes an implementation plan, and an implementation phase where it produces the diff. Reviewers should read the plan *first* and check that every Requirement is named. If a Requirement is missing from the plan, do not let the agent proceed; comment, regenerate the plan, then implement.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 2. Why do we keep OWASP and STRIDE as separate pack families? Aren't they overlapping?</summary>

They overlap on outputs but not on inputs.

OWASP starts from a known bug class and tells you how to close it. It is a *catalogue*. If you know you have an A03, the A03 pack is right there.

STRIDE starts from a system component and asks *what could go wrong here even if no known bug class fits*. It is a *frame*. The same celebrity favorites feature, run through STRIDE, surfaces things OWASP does not: an attacker spoofs another user's favorite (Spoofing); an attacker tampers with the favorite count to inflate a celebrity's ranking (Tampering); a user later denies favoriting a celebrity in a defamation suit (Repudiation, which needs an audit trail).

Different families because they answer different questions. A mature team runs STRIDE before the feature exists and OWASP during the work. Either alone is a partial defense.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 3. Can my team write our own packs?</summary>

Yes, and you will. The shipped packs cover the canonical OWASP, STRIDE, and core maintainability concerns. Most teams add packs for:

- **Domain-specific safety.** A healthcare team adds a `phi-handling.md` pack with the encryption-at-rest, key-rotation, and audit-log requirements every PHI-touching feature must satisfy.
- **Framework conventions.** A team standardised on a particular Express middleware order adds a `middleware-order.md` pack so every new endpoint follows it.
- **Architecture rules.** Part 4 introduces a `maintainability/calm-layer-enforcement.md` pack that derives rules from the BAR's CALM model. This is where prompt packs meet the architecture.

The packs are markdown files in your repo. You version them, you code-review them, you delete them when they stop applying. They are part of your codebase. Treat them like it.

</details>

---

## Try it yourself: an RCTRO for a hypothetical feature

Pick a feature the IMDB Lite app does not have yet. Below are three suggestions; pick one (or invent your own). Draft a one-page RCTRO. Decide which packs apply. Do not run Cheshire this time. The point is to internalise the pack-selection muscle.

### Suggested features

- **A. Movie reviews need moderation.** Add an admin endpoint to soft-delete a review with a recorded reason.
- **B. Celebrity image proxy needs caching.** Add a Redis-backed cache in front of the existing image proxy in celeb-api.
- **C. User wants to download their data.** Add a `GET /me/export` endpoint to imdb-identity that returns all of the user's data as JSON.

### What to write

1. **Role.** One sentence.
2. **Context.** Which repos, which CALM flows, which BAR, what tier.
3. **Task.** One sentence.
4. **Requirements.** Pick the packs that apply. List them. For each, list the top three checklist items you remember from the pack tour above.
5. **Output.** What files, what doesn't change.

### Check your work

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work — Feature A (review moderation)</summary>

**Packs that apply:** `owasp/A01` (admin-only authorisation), `owasp/A09` (audit log of moderation actions), `stride/repudiation` (admin can't deny taking the action; needs signed audit), `maintainability/single-responsibility`.

**What good Requirements look like:** admin role check, reason field required and stored, soft-delete (not hard-delete) so the audit chain survives, log event includes moderator user ID and reason hash, no PII in log line, tests for non-admin denied, admin allowed, reason missing rejected.

A common miss: forgetting STRIDE Repudiation. Soft-delete with no audit signature lets a hostile admin claim "the system did it". The pack flags this.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work — Feature B (image proxy caching)</summary>

**Packs that apply:** `owasp/A10` (the existing SSRF risk in the proxy does NOT disappear when you add caching, and cache poisoning is a thing), `owasp/A05` (Redis config: auth, no public binding), `maintainability/complexity-reduction`, `maintainability/dependency-hygiene` (new Redis client dep).

**What good Requirements look like:** cache key derived from validated URL only (not raw URL), TTL bounded (no infinite cache), URL allowlist still applies *before* cache lookup (cache after validation, not before), Redis bound to localhost or VPC, cache invalidation on celebrity image update.

A common miss: putting the cache check *before* the URL allowlist. The SSRF risk just got worse, because now a poisoned cache entry serves attacker-controlled bytes forever.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work — Feature C (data export)</summary>

**Packs that apply:** `owasp/A01` (user can only export their own data, IDOR), `owasp/A02` (export probably contains PII; how is it transmitted, encrypted), `owasp/A04` (rate-limit; export is expensive and a DDoS vector), `stride/information-disclosure` (what counts as the user's data, what's metadata, what about deleted records), `maintainability/single-responsibility`.

**What good Requirements look like:** auth required, user ID from JWT not query param, response is JSON not file (no temp files on disk), rate limit one request per user per hour, audit log of every export, soft-deleted records excluded (or included with explicit flag and legal sign-off).

A common miss: missing the legal sign-off question. GDPR Article 15 says you must export the user's data. It also says you must not export data about *other* people that happens to be in the user's records. That distinction needs a human, and the STRIDE pack flags it.

</details>

---

## What you learned

- **Generic prompts produce generic bugs.** "Add a search endpoint" yields concatenated SQL, no validation, leaky errors, and no tests, because the contract was missing.
- **RCTRO has five sections, each a guardrail.** Role frames the agent, Context anchors it in your system, Task says what to do, Requirements are the machine-checkable constraints, Output is the shape of the result. Skip any one and the agent invents the missing piece from training data.
- **Three pack families, three different jobs.** OWASP is the *catalogue* of known attacks (reach for it during work). STRIDE is the *frame* for design-time threat surfacing (reach for it before code exists). Maintainability is the *erosion control* (reach for it on every feature). Either alone is a partial defense.
- **Hand-drafted Requirements run 4 to 8 bullets. Cheshire-generated Requirements run 25 to 40.** The difference is institutional memory the pack carries; the gap is the value of the pack.
- **Packs are versioned, code-reviewed assets**, not personal notes. The same pack drives every fix in its class; bumping the pack updates the contract everywhere at once.
- **Pack selection has a rule of thumb.** Bug fix for a known class → OWASP for that class. New feature touching trust or data → STRIDE before, OWASP during, Maintainability always. Refactor → Maintainability only. Cross-repo flow → STRIDE first.
- **Knowing when *not* to assign the agent is part of the contract**, too. A Stage 3 feature on a Restricted-tier repo is the right time to wait, not the right time to push the limits.

---

## The Golden Rule for this part

> **Rule 2. Write the full contract before asking for code.**
>
> Every line of an RCTRO is a guardrail. Every section of a prompt pack is institutional memory. Skip them and the agent invents acceptance criteria that match its training data, not your system. The agentic SDLC's leverage comes from moving human effort upstream into the contract. **The contract is the work.**

---

## What is next: Part 3. Alice Remediates

You have the contract language and the library. Part 3 is the live class. We push the celeb-api to GitHub, CodeQL fires, four `codeql-finding` issues appear, and we walk through the full Cheshire enrich → assign agent → review PR → merge loop on the planted A03 SQL injection in `/search`. By the end of Part 3 the celeb-api has shipped its first AI-assisted PR and the scorecard moves from 5 to roughly 15.

[Continue to Part 3 →](/docs/workshop/part3-live-remediation)
