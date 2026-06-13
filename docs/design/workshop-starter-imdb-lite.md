# Workshop Starter Pack — IMDB Lite

**Status:** Partly shipped. The **governance-mesh sample** (PLT-IMDB + two BARs + the two sample OKRs) and the **Looking Glass repo-staging** flow are implemented in the VS Code extension (see "Sample-platform staging" below). The runnable **brownfield repo content** (movie-api / imdb-react-frontend / imdb-identity starter code with planted issues) is still to be authored.
**Purpose:** Internal design doc for the four code repositories the 8-part workshop is built on.
**Audience:** Workshop authors, repo maintainers, future facilitators.

This document is **not published** to the public site. It is the source of truth for what the workshop's hands-on substrate must contain so every part has real code to build and real code to fix.

---

## Why a starter pack

To make Parts 1–8 work as a continuous live-class scenario, learners need real codebases. The starter pack splits into **two complementary tracks** so the workshop teaches both halves of the framework:

- **Greenfield (build it):** `celeb-api` does **not** exist as code at the start. Learners drive the **agentic SDLC** end-to-end — WHY (research) → HOW (PRD) → WHAT (code design) → implementation fan-out — and watch the Copilot agent personas build the service from the PRD under the Red Queen's deterministic policy. There is intentionally nothing to clone; the repo is created empty and built.
- **Brownfield (fix it):** `movie-api`, `imdb-react-frontend`, and `imdb-identity` ship with deliberately broken code. The remediation exercises (live A03 fix, CodeQL/Snyk triage, fitness functions) run against **`movie-api`** — the canonical brownfield repo the workshop walks through in Parts 3–5.

It maps onto the **IMDB Lite** sample platform the VS Code extension creates in Looking Glass (`Looking Glass → Create Sample Platform → IMDB Lite`). That sample creates two BARs in the governance mesh:

- `APP-IMDB-001` — IMDB Lite Application (movies, reviews, ratings) — repos: `imdb-react-frontend`, `imdb-identity`, `movie-api`
- `APP-IMDB-002` — IMDB Celebs (celebrity profiles, news) — repo: `celeb-api` (greenfield)

`APP-IMDB-002` is intentionally **sparse** (no security pillar) so it scores **Restricted** tier — that asymmetry is the first-hour teaching moment (you hit the governance wall, then earn autonomy). `celeb-api` is its greenfield target.

---

## The four repositories

| Repo | Stack | BAR mapping | Mode | Role in the workshop |
|---|---|---|---|---|
| `celeb-api` | TypeScript + Express + PostgreSQL | `APP-IMDB-002` | **greenfield** | Built from scratch by the agentic SDLC (WHY→HOW→WHAT→implement). The canonical "build it under governance" track. No planted code — it starts empty. |
| `movie-api` | TypeScript + Express + PostgreSQL | `APP-IMDB-001` | **brownfield** | Movie catalogue + reviews with planted vulnerabilities. **The canonical remediation repo** the workshop walks through in Parts 3–5. |
| `imdb-identity` | TypeScript + Express + PostgreSQL + JWT | `APP-IMDB-001` | brownfield | Auth/identity service with planted crypto/auth/logging issues (extension exercises). |
| `imdb-react-frontend` | React 19 + Vite + TypeScript + Tailwind | spans both BARs (UI tier) | brownfield | SPA with planted client-side issues; touched in the cross-cutting capstone. |

All four ship with a `docker-compose.yml` at the workshop-pack root so learners can `docker compose up` and have a working local environment in minutes. (`celeb-api`'s entry is added once the greenfield build produces it.)

---

## CALM architecture (declared in the mesh)

The two BARs share architecture nodes in the IMDB Lite platform:

```
Nodes:
  imdb-react-frontend   (UI tier, react)
  imdb-identity         (api tier, express)
  movie-api             (api tier, express)
  celeb-api             (api tier, express)
  identity-db           (data tier, postgres)
  movie-db              (data tier, postgres)
  celeb-db              (data tier, postgres)
  news-feed             (external, https)

Declared flows:
  imdb-react-frontend → imdb-identity → identity-db
  imdb-react-frontend → movie-api      → movie-db
  imdb-react-frontend → celeb-api      → celeb-db
  celeb-api           → news-feed

Explicitly NOT declared (the Red Queen policy denies these):
  imdb-react-frontend → identity-db
  imdb-react-frontend → movie-db
  imdb-react-frontend → celeb-db
  movie-api           → celeb-db
  celeb-api           → identity-db
```

This CALM model is the **source the Red Queen policy is compiled from** (see below). The frontend cannot go around an API to reach a database; services cannot read each other's databases.

---

## Red Queen — deterministic governance (current model)

> The workshop's earlier drafts described an interactive `validate_action` MCP tool the agent calls mid-run. **That is not how it works now.** The Red Queen is a **deterministic, baked policy** enforced at the tool-call boundary — see [`docs/red-queens-court`](../../site-tw/public/docs/red-queens-court.md) and the design notes in [`redqueen-break-glass.md`](../../vscode-extension/design/redqueen-break-glass.md).

How it governs an agent working in any of these repos:

1. **Provision (mesh → repo, at scaffold/Deploy time).** The extension reads the BAR's tier + governance rules **from the mesh** (the CALM flows above, the BAR's composite score → tier) and bakes them into the code repo as committed `.redqueen/policy.json` + `.redqueen/decision.json`. The mesh is consumed only here.
2. **Enforce (runtime, deterministic, no network).** Every tool call passes a **PreToolUse hook** (`.github/hooks/redqueen.json` for Copilot / `.claude/settings.json` for Claude Code → `.redqueen/hooks/validate-tool.{sh,js}`), which reads the local `policy.json` and allows/denies fail-closed, appending every decision to `.redqueen/audit-log.jsonl`. Tier rules (TIER-001/002/003), security-critical paths (SEC-001), and read-only paths (CTRL-001) are evaluated here.
3. **Prove (merge time).** `impl-provenance.yml` re-hashes the committed decision chain at the merge SHA and gates on a mismatch.
4. **Break-glass (restricted-tier override).** Because `APP-IMDB-002` (celeb-api) is Restricted, an agent there hard-denies `Write`/`Bash`. A human can grant a **scoped, audited, single-active, 2-hour break-glass** (one click from the Scorecard, written to committed `.redqueen/approvals.json`, agent-read-only) that flips TIER-001/002/003 so the agent can do governed work — while **SEC-001 + CTRL-001 stay hard**. This is the "escalate to unlock autonomy" loop learners feel in their first hour, and it auto-clears on merge.

The deny on `imdb-react-frontend → celeb-db` (and the other undeclared flows) is what Part 7 demonstrates: the policy, compiled from the CALM model, blocks the cross-tier database reach deterministically.

---

## Planted issues (brownfield repos)

`celeb-api` has **no planted issues** — it's greenfield. The remediation curriculum lives in the brownfield repos, with **`movie-api` as the canonical Part 3–5 walkthrough repo**.

### `movie-api` — the canonical remediation repo

| File | Issue | OWASP | Fixed in |
|---|---|---|---|
| `src/routes/movies.ts` | String-concatenated SQL in `GET /movies?genre=` | A03 Injection | Part 3 (live class) |
| `src/routes/reviews.ts` | Stored XSS via unsanitised review body | A03 Injection (stored XSS) | Part 3 (extension exercise) |
| `src/routes/movies.ts` | `POST /movies` accepts unauthenticated requests (should be admin) | A01 Broken Access Control | Part 4 (CodeQL flags) |
| `src/routes/poster-proxy.ts` | SSRF via `GET /poster?url=` — no URL allowlist, no IP-range block | A10 SSRF | Part 5 (CodeQL surfaces it) |
| `src/services/ratings-feed.ts` | Hardcoded external ratings-feed API key | A02 Crypto / Secrets | Part 5 (Snyk surfaces it) |
| `src/middleware/error.ts` | Stack traces leaked to API consumers in production | A05 Security Misconfiguration | Part 4 |
| `src/routes/movies.ts` | Cyclomatic complexity 14 on `formatMovieResponse` | (maintainability) | Part 4 (fitness function flags it) |
| `package.json` | `lodash@4.17.15` (known CVE) | A06 Vulnerable Components | Part 5 (Snyk flags) |

### `imdb-identity`

| File | Issue | OWASP | Fixed in |
|---|---|---|---|
| `src/services/password.ts` | MD5 password hashing instead of bcrypt | A02 Crypto Failures | Part 3 (extension exercise) |
| `src/routes/auth.ts` | No rate limiting on `POST /auth/login` | A07 Auth Failures | Part 3 (extension exercise) |
| `src/lib/jwt.ts` | Hardcoded JWT signing secret | A02 Crypto Failures / Secrets | Part 5 (Snyk flags secret) |
| `src/middleware/logger.ts` | Logs request bodies including password fields | A09 Logging Failures | Part 4 (fitness function on log scrubbing) |

### `imdb-react-frontend`

| File | Issue | OWASP | Fixed in |
|---|---|---|---|
| `src/components/ReviewBody.tsx` | `dangerouslySetInnerHTML` on user-submitted markdown | A03 Injection (XSS) | Part 5 |
| `src/pages/Profile.tsx` | Missing CSRF token on profile update form | A01 Broken Access Control | Part 6 |
| `src/api/movie-client.ts` | Hardcoded API base URL | A05 Security Misconfiguration | Part 4 |
| `src/lib/redirect.ts` | Open redirect: `?redirect=` accepted from query and used without allowlist | A10 SSRF (open redirect) | Part 7 (Red Queen policy blocks the bad pattern) |

---

## The two tracks across the workshop

| Part | Activity | Repo(s) | Concept exercised |
|---|---|---|---|
| Part 1 | Spectrum + scaffold governance; hit the Restricted-tier wall on the celeb-api BAR | mesh | Tiers, the governance wall |
| Part 2 | RCTRO issue generated for a `celeb-api` greenfield feature | none (issue only) | RCTRO format, Cheshire workflow |
| Part 3 | **Live remediation** of the A03 SQL injection in `movie-api`, with Zod validation, tests, AI-disclosure commit | `movie-api` | Live remediation, prompt-pack usage |
| Part 4 | 4 fitness functions wired into CI (complexity, freshness, coverage, p95) on `movie-api` | `movie-api` | Quality gates as code |
| Part 5 | CodeQL + Snyk running; SARIF triage with Cheshire issue generation | `movie-api` | Scanner-backed remediation |
| Part 6 | Prompt packs versioned in `.cheshire/prompts/` with semver tags; Hatter's Tag manifest | `movie-api` + `imdb-react-frontend` | Prompt-library hygiene, provenance |
| Part 7 | Red Queen deterministic policy; PreToolUse hook denies `imdb-react-frontend → celeb-db`; break-glass demo on the Restricted celeb BAR | `celeb-api`, `imdb-react-frontend` | Deterministic governance + break-glass |
| Part 8 | **Greenfield capstone:** build `celeb-api` end-to-end via the agentic SDLC (WHY→HOW→WHAT→implement fan-out) from `OKR-…-IMDB-…-celeb-api`, with the full signed evidence chain | all four repos | Capstone — full agentic SDLC, greenfield |

---

## Sample-platform staging (Looking Glass)

`Looking Glass → Create Sample Platform → IMDB Lite` does two things:

1. **(Re)seeds the governance mesh** — `PLT-IMDB` + `APP-IMDB-001` / `APP-IMDB-002` (overwrites the local `platforms/imdb-lite/` so the latest templates apply) + the two sample OKRs (`…-celeb-api`, `…-movie-api`). On a fresh start the OKRs are **reset** (the `okrs/<id>/` dir — incl. `design-fan-out.yaml` + `audit/` — is wiped and re-seeded); otherwise they're idempotent.
2. **Stages the four GitHub sample repos fresh** (when the mesh has a GitHub remote), so a re-run of the OKR test starts from zero accumulated state. This is **clean-slate reset**, gated by a modal confirm (with live counts) whenever existing state is detected:
   - close any open PRs + issues left by prior runs,
   - delete non-default branches (the leftover `copilot/*` fan-out branches),
   - **greenfield** (`celeb-api`): reset `main` to an empty greenfield commit (README + `.gitignore`) — discards contents and rewrites history, so the design-bus fan-out builds it from the PRD,
   - **brownfield** (`movie-api`, `imdb-react-frontend`, `imdb-identity`): leave `main` untouched (the baseline); only branches/PRs/issues are cleaned.

   The confirm offers **"Reset to fresh"**, **"Mesh only (skip GitHub)"** (local-only — keeps repo contents), or Cancel. With no GitHub remote on the mesh it falls back to mesh-only automatically.

Implementation: `SampleRepoStager` (`vscode-extension/src/services/SampleRepoStager.ts`) + the staging methods on `GitHubService` + the `reset` path on `MeshService.scaffoldImdbLiteOkr` / `scaffoldImdbLiteMovieApiOkr`, wired in `LookingGlassPanel.onSampleImdbLite`.

> **Brownfield baseline caveat:** "keep brownfield `main`" means prior *merged* test work stays on `main`. For a perfectly pristine brownfield re-test we'd snapshot a `workshop-baseline` tag and reset to it — not implemented; the cleanup only removes in-flight branches/PRs/issues.

---

## Local environment (workshop pack root)

The pack ships as `imdb-lite-workshop-pack/` with this layout:

```
imdb-lite-workshop-pack/
  README.md                          (5-minute setup)
  docker-compose.yml                 (services + dbs)
  .env.example
  governance-mesh/                   (pre-seeded mesh with both BARs)
    mesh.yaml
    platforms/imdb-lite/...
  repos/
    movie-api/                       (full repo, planted issues + missing features)
    imdb-identity/
    imdb-react-frontend/
    # celeb-api is NOT shipped here — it's greenfield, built during the workshop
  data/
    seed/                            (postgres seed SQL)
```

The pack starts ungoverned and brownfield-only; `celeb-api` is created and built **during** the workshop. The point is to start ungoverned and earn the score.

---

## Repository conventions

All repos share:

- **Language:** TypeScript everywhere, strict mode.
- **Testing:** Jest for backends, Vitest for the frontend. Coverage in `coverage/coverage-summary.json` so the Cheshire scorecard reads them.
- **Lint:** ESLint with `@typescript-eslint/recommended` plus `eslint-plugin-security`.
- **CI:** None pre-shipped for brownfield repos. Learners scaffold CI in Part 4 via Cheshire `Scaffold SDLC`. The greenfield `celeb-api` gets its CI from the fan-out scaffold.
- **Secrets:** All real-looking secrets are obviously fake. Planted hardcoded keys are realistic-looking but non-functional.
- **Tests for planted issues (brownfield):** each planted vulnerability has a passing test that *demonstrates* it; after the fix, the test asserts the *prevention*.

---

## Open questions

1. **Hosting** — public GitHub org (`AliceNN-ucdenver/*`) or behind a workshop login? Recommendation: public (planted issues are clearly educational).
2. **Refresh cadence** — quarterly bump of the planted "current" CVEs so Part 5 always finds something.
3. **Cloud variant** — deployable variant (Fly.io / Render / Railway) for Part 8's "deploy and watch the Red Queen audit log fill"? Recommendation: add in v1.1.
4. **Identity service** — real JWTs the other APIs verify, vs a shared header convention? Recommendation: real JWTs so auth fixes are testable end-to-end.

---

## Implementation order (suggested)

1. **v0.1** — `movie-api` brownfield with the Part 3 SQL injection. Enough to run Parts 1–3 against the remediation track.
2. **v0.2** — Add `imdb-react-frontend` + the greenfield `celeb-api` OKR build (Part 8 capstone end-to-end).
3. **v0.3** — Add `imdb-identity` + the cross-service capstone polish. Enough for Parts 4–8.
4. **v1.0** — docker-compose hardening, seed-data refresh.

Owner: workshop author. Timeline: align with the workshop ship date.
