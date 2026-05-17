# Workshop Starter Pack — IMDB Lite

**Status:** Design — not yet implemented.
**Purpose:** Internal design doc for the four code repositories the 8-part workshop is built on.
**Audience:** Workshop authors, repo maintainers, future facilitators.

This document is **not published** to the public site. It is the source of truth for what the workshop's hands-on substrate must contain so every part has real code to fix and real features to add.

---

## Why a starter pack

The workshop today references a `celeb-api` BAR generically. To make Parts 1–8 work as a continuous live-class scenario, learners need an actual codebase they can clone, run locally, scaffold governance into, fix planted vulnerabilities in, and ship new features against. The starter pack is that codebase.

It maps onto the **IMDB Lite** sample platform the VS Code extension already knows how to create in Looking Glass (`Looking Glass → Create Sample Platform → IMDB Lite`). That sample creates two BARs in the governance mesh:

- `APP-IMDB-001` — IMDB Lite Application (movies, reviews, ratings)
- `APP-IMDB-002` — IMDB Celebs (celebrity profiles, news)

The starter pack expands the architecture inside those BARs into four runnable code repositories that learners actually clone and modify.

---

## The four repositories

| Repo | Stack | BAR mapping | Role in the architecture |
|---|---|---|---|
| `imdb-react-frontend` | React 19 + Vite + TypeScript + Tailwind | spans both BARs (UI tier) | Single-page app. Movie list/detail, celebrity list/detail, login, user profile, favourites. Calls all three backend services. |
| `imdb-identity` | TypeScript + Express + PostgreSQL + JWT | `APP-IMDB-001` | Auth and identity service. Login, register, profile, refresh tokens, password reset. |
| `movie-api` | TypeScript + Express + PostgreSQL | `APP-IMDB-001` | Movie catalogue and reviews. Public movie data plus authenticated review submission. |
| `celeb-api` | TypeScript + Express + PostgreSQL | `APP-IMDB-002` | Celebrity profiles, search, news. This is the canonical repo the workshop walks through end to end in Parts 1–7. |

All four ship with a `docker-compose.yml` at the workshop-pack root so learners can `docker compose up` and have a working five-service local environment in under five minutes.

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

Explicitly NOT declared (Red Queen will block in Part 7):
  imdb-react-frontend → identity-db
  imdb-react-frontend → movie-db
  imdb-react-frontend → celeb-db
  movie-api           → celeb-db
  celeb-api           → identity-db
```

This is what the Red Queen `validate_action` MCP tool checks against in Part 7. The frontend cannot go around an API to reach a database. Services cannot read each other's databases.

---

## Planted issues (intentionally vulnerable code)

Each repository ships with deliberately broken code. The workshop is structured around fixing it in the right order with the right tools. Every planted issue maps to a specific OWASP category and a specific workshop part.

### `celeb-api` — the canonical Part 3 repo

| File | Issue | OWASP | Fixed in |
|---|---|---|---|
| `src/routes/search.ts` | String-concatenated SQL in `GET /search?q=` | A03 Injection | Part 3 |
| `src/routes/celebrity.ts` | IDOR on `GET /celebrities/:id` — no ownership check on private profiles | A01 Broken Access Control | Part 3 (secondary exercise) |
| `src/routes/image-proxy.ts` | SSRF via `GET /image?url=` — no URL allowlist, no IP-range block | A10 SSRF | Part 5 (CodeQL surfaces it) |
| `src/services/news-feed.ts` | Hardcoded external news-feed API key | A02 Crypto / Secrets | Part 5 (Snyk surfaces it) |
| `src/routes/celebrity.ts` | Cyclomatic complexity 14 on `formatCelebrityResponse` | (maintainability) | Part 4 (fitness function flags it) |
| `package.json` | `lodash@4.17.15` (known CVE) | A06 Vulnerable Components | Part 5 (Snyk flags) |

### `imdb-identity`

| File | Issue | OWASP | Fixed in |
|---|---|---|---|
| `src/services/password.ts` | MD5 password hashing instead of bcrypt | A02 Crypto Failures | Part 3 (extension exercise) |
| `src/routes/auth.ts` | No rate limiting on `POST /auth/login` | A07 Auth Failures | Part 3 (extension exercise) |
| `src/lib/jwt.ts` | Hardcoded JWT signing secret | A02 Crypto Failures / Secrets | Part 5 (Snyk flags secret) |
| `src/middleware/logger.ts` | Logs request bodies including password fields | A09 Logging Failures | Part 4 (fitness function on log scrubbing) |

### `movie-api`

| File | Issue | OWASP | Fixed in |
|---|---|---|---|
| `src/routes/movies.ts` | SQL injection via `genre` query parameter | A03 Injection | Part 3 (extension exercise) |
| `src/routes/movies.ts` | `POST /movies` accepts unauthenticated requests (should be admin) | A01 Broken Access Control | Part 4 (CodeQL flags) |
| `src/routes/reviews.ts` | XSS via unsanitised review body stored and rendered raw | A03 Injection (stored XSS) | Part 5 |
| `src/middleware/error.ts` | Stack traces leaked to API consumers in production | A05 Security Misconfiguration | Part 4 |

### `imdb-react-frontend`

| File | Issue | OWASP | Fixed in |
|---|---|---|---|
| `src/components/ReviewBody.tsx` | `dangerouslySetInnerHTML` on user-submitted markdown | A03 Injection (XSS) | Part 5 |
| `src/pages/Profile.tsx` | Missing CSRF token on profile update form | A01 Broken Access Control | Part 6 |
| `src/api/celeb-client.ts` | Hardcoded API base URL | A05 Security Misconfiguration | Part 4 |
| `src/lib/redirect.ts` | Open redirect: `?redirect=` param accepted from query string and used without allowlist | A10 SSRF (open redirect) | Part 7 (Red Queen policy blocks the bad pattern) |

---

## New features added across the workshop

The starter pack also ships **incomplete** code. Each part adds one feature that exercises the part's main concept.

| Part | Feature added | Repo(s) touched | Concept exercised |
|---|---|---|---|
| Part 2 | RCTRO issue generated for "add celebrity name search" | none (issue only) | RCTRO format, Cheshire workflow |
| Part 3 | Parameterised `GET /search?q=` endpoint with Zod validation, tests, and AI-disclosure commit | `celeb-api` | Live remediation, prompt-pack usage |
| Part 4 | 4 fitness functions wired into CI (complexity, freshness, coverage, p95) | `celeb-api` | Quality gates as code |
| Part 5 | CodeQL + Snyk workflows running, SARIF triage with Cheshire issue generation | `celeb-api` | Scanner backed remediation |
| Part 6 | Prompt packs versioned in `.cheshire/prompts/` with semantic version tags; Hatter's Tag manifest on the next PR | `celeb-api` plus `imdb-react-frontend` | Prompt-library hygiene, provenance |
| Part 7 | Red Queen installed; PreToolUse hook blocks `imdb-react-frontend → celeb-db` direct query attempt; `validate_action` policy added | `celeb-api`, `imdb-react-frontend` | Deterministic governance |
| Part 8 | Cross-cutting "favourite a celebrity" feature: schema in `celeb-api`, persistence in `imdb-identity`, UI in `imdb-react-frontend`, full evidence chain | all four repos | Capstone — full agentic SDLC |

---

## Local environment (workshop pack root)

The pack ships as `imdb-lite-workshop-pack/` with this layout:

```
imdb-lite-workshop-pack/
  README.md                          (5-minute setup)
  docker-compose.yml                 (all 4 services + 3 dbs)
  .env.example
  governance-mesh/                   (pre-seeded mesh with both BARs)
    mesh.yaml
    platforms/imdb-lite/...
    bars/APP-IMDB-001.bar.yaml
    bars/APP-IMDB-002.bar.yaml
  repos/
    imdb-react-frontend/             (full repo, planted issues + missing features)
    imdb-identity/
    movie-api/
    celeb-api/
  data/
    seed/                            (postgres seed SQL — 50 movies, 30 celebrities, 5 users)
```

Setup command:
```bash
git clone https://github.com/AliceNN-ucdenver/imdb-lite-workshop-pack.git
cd imdb-lite-workshop-pack
cp .env.example .env
docker compose up -d
open http://localhost:5173        # the frontend
```

The pack does NOT pre-install the MaintainabilityAI VS Code extension or scaffold any governance files. That happens **during** the workshop, part by part. The point is to start ungoverned and earn the score.

---

## Repository conventions

All four repos share:

- **Language:** TypeScript everywhere, strict mode.
- **Testing:** Jest for backends, Vitest for the frontend. Coverage reports in `coverage/coverage-summary.json` so the Cheshire scorecard reads them.
- **Lint:** ESLint with `@typescript-eslint/recommended` plus security rules (`eslint-plugin-security`).
- **CI:** None pre-shipped. Learners scaffold CI in Part 4 via the Cheshire `Scaffold SDLC` flow.
- **Secrets:** All real-looking secrets are obviously fake (`postgres://workshop:workshop@...`). The planted hardcoded keys are realistic-looking but non-functional.
- **Tests for planted issues:** Each planted vulnerability has a passing test that *demonstrates* it works. After the fix, the test changes to assert the *prevention*. This is how learners see the fix concretely.

---

## Open questions

1. **Hosting** — public GitHub org (`AliceNN-ucdenver/imdb-lite-workshop-pack`) or behind a workshop login? Recommendation: public, since the planted issues are obviously labelled and educational.
2. **Refresh cadence** — dependency CVEs change. Recommend a quarterly bump of the planted "current" CVEs so Part 5 always finds something.
3. **Cloud variant** — do we need a deployable variant (Fly.io / Render / Railway) for Part 8's "deploy and watch the Red Queen audit log fill" exercise? Recommendation: yes, add in v1.1.
4. **Identity service** — do we want `imdb-identity` to issue real JWTs the other APIs verify, or is a shared header convention sufficient? Recommendation: real JWTs so the auth fixes in Parts 3 and 4 are testable end-to-end.

---

## Implementation order (suggested)

If we build this in stages:

1. **v0.1** — `celeb-api` only with the Part 3 SQL injection. Enough to run Parts 1–3.
2. **v0.2** — Add `movie-api` and `imdb-react-frontend`. Enough to run Parts 4–6.
3. **v0.3** — Add `imdb-identity` and the cross-service capstone feature spec. Enough to run Parts 7–8.
4. **v1.0** — Polish, docker-compose hardening, seed data refresh.

Owner: workshop author. Timeline: align with the workshop ship date.
