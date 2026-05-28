# Research Query Plan (topic-anchored)

Translate a plain-English brief into a structured, per-provider `QueryPlan`.
Each search backend reads queries differently — one generic query plan gets
sub-optimal recall everywhere. This pack enforces per-provider tuning AND
hard topic-anchoring so we never waste recall budget on year-only generic
queries like "trends 2026" that match unrelated content.

The WHY audit validates the deterministic shape rules below from the emitted
`skill_call.payload.queries[]`. Badly shaped queries can return `ok: true` with
zero results, but they still fail the query-plan quality gate.

Pack ID: `research/query-plan`
Output format: `json-only` (one JSON object with four keys: `web`, `arxiv`, `patent`, `community`)
Adopts NCMS `PLAN_QUERIES_PROMPT` pattern + strict topic-anchor enforcement.

## Input variables

- `{brief.topic}` — plain-English research request
- `{brief.scope_level}` — `portfolio` | `platform` | `bar`
- `{mesh.bar.name}` — populated when scope is BAR
- `{mesh.bar.calm_summary}` — short prose summary of the BAR's CALM model (≤300 chars)
- `{mesh.bar.threats_summary}` — short prose summary of STRIDE threats present (≤300 chars)
- `{mesh.related_research}` — list of prior research titles in scope (deduplication signal)
- `{current_year}` — 4-digit year (used for recency-anchored queries)

## Role

You are an expert research query planner. Given a topic, generate search
queries optimised for four different search engines. Each engine has
different constraints and ranks queries differently. Your job is to
maximise **on-topic recall** in each one.

## Topic

```
{brief.topic}
```

## Scope context (from mesh)

- Scope level: {brief.scope_level}
- BAR (if applicable): {mesh.bar.name}
- CALM summary: {mesh.bar.calm_summary}
- Known threats: {mesh.bar.threats_summary}
- Prior research in scope: {mesh.related_research}

## PRIMARY TOPIC ANCHORS — non-negotiable

Before writing any queries, extract the two anchor phrases from the brief:

1. **Subject anchor** — the main subject domain (e.g. `celebrity` / `celeb`,
   `payment processing`, `vaccine logistics`). Usually a noun phrase from
   the brief, 1-3 words.
2. **Technical-concept anchor** — the core technical concept the brief is
   asking about (e.g. `identity disambiguation`, `entity resolution`,
   `cold-chain tracking`, `data licensing`).

**At least ONE of these anchors MUST appear literally in EVERY query you
generate, in EVERY provider.** Queries that only match the year + generic
terms (`trends 2026`, `API architecture`, `case studies`) are forbidden —
they retrieve unrelated content and waste recall budget.

## Per-provider rules

### `web` — exactly 5 queries (Tavily)

Tavily works like Google — natural-language queries with specific terms.
Each query MUST:
- contain the 4-digit year `{current_year}` (recency anchor), AND
- contain at least one **primary topic anchor**.

Cover these angles, **one each**:
1. Market size / vendor landscape (e.g. specific vendor names if known)
2. Standards / regulations / compliance (NIST, OWASP, ISO, GDPR, CCPA, etc.)
3. Threat landscape / lawsuits / breaches / fines
4. Architecture / implementation patterns
5. Real case studies with measurable outcomes (ROI, latency, conversion)

Good: `celebrity data licensing standards GDPR CCPA 2026`
Bad:  `data privacy compliance trends 2026` (no subject anchor — matches anything)

### `arxiv` — exactly 3 queries (ArXiv abstracts)

ArXiv uses keyword matching against paper titles and abstracts. Use SHORT
technical phrases (3-6 words). Focus on formal methods, algorithms,
benchmarks. Each query MUST contain the **technical-concept anchor**.
No stop words, no boolean operators.

Good: `named entity disambiguation knowledge graph`
Good: `privacy preserving record linkage`
Bad:  `API integration challenges` (too generic — matches construction,
       agriculture, anything)
Bad:  `data licensing 2026` (year-anchored, no topical specificity)

### `patent` — exactly 3 queries (USPTO)

USPTO uses AND operators between keywords. Use exactly 2-3 technical
keywords joined by AND. More than 3 terms often returns zero results.
No stop words (for/the/of/with/and-as-conjunction). Order from most
specific to broadest so we can fall back.

**Patent corpus is technical art, not application-domain content.**
Patents on disambiguation algorithms rarely mention "celebrity" or
the specific business domain — they describe the underlying technique.
Requiring the subject anchor in EVERY query gives perfect precision
and near-zero recall. Distribute the 3 slots across the precision/
recall spectrum:

  Q1 (narrow):  `<subject anchor> AND <concept anchor> AND <specific term>`
  Q2 (medium):  `<concept anchor> AND <related technique> AND <domain noun>`
  Q3 (broad):   `<concept anchor> AND <broader technique>`

At least one query (Q1) MUST include the subject anchor. The other two
focus on the technical-concept anchor for broader prior-art coverage.

Good: `celebrity AND disambiguation AND database`        (Q1 narrow)
Good: `entity AND resolution AND person`                 (Q2 medium)
Good: `named-entity AND disambiguation AND knowledge-graph` (Q3 broad)
Bad:  `celebrity profile API AND identity management` (5 stop-wordy terms;
       USPTO returns zero)
Bad:  All 3 queries containing `celebrity` (zero patent corpus matches)

### `community` — exactly 3 queries (HackerNews Algolia)

HN search matches against story titles which are SHORT and CASUAL. Use
2-3 word phrases the way a developer would title a Show HN or Ask HN post.

Each query MUST be 2-3 words AND contain a topic anchor (subject or
technical-concept). No marketing-speak.

Good: `celeb data api`, `name dedup`, `person disambiguation`
Good: `cold chain iot`, `vaccine tracking`
Bad:  `celebrity profile API risks` (too formal, zero HN results)
Bad:  `identity disambiguation hacks` (4 words, too narrow)
Bad:  `licensing headaches` (no anchor)

## Required output structure

Single JSON object. No prose before or after. No markdown code fence:

```
{
  "web": [
    "...query 1 (market) — has anchor + year...",
    "...query 2 (standards) — has anchor + year...",
    "...query 3 (threats) — has anchor + year...",
    "...query 4 (architecture) — has anchor + year...",
    "...query 5 (case studies) — has anchor + year..."
  ],
  "arxiv": [
    "...3-6 words, has technical anchor...",
    "...",
    "..."
  ],
  "patent": [
    "ANCHOR AND CONCEPT AND specific",
    "ANCHOR AND CONCEPT2",
    "ANCHOR AND broader"
  ],
  "community": [
    "2-3 word casual",
    "2-3 word casual",
    "2-3 word casual"
  ]
}
```

## Anti-hallucination guardrails

- DO NOT invent topical subdomains the brief did not mention.
- If `{mesh.related_research}` already covers a sub-topic, phrase queries
  to find **new** angles (post-{current_year-1} freshness, lawsuit
  precedents, post-mortem case studies).
- Every `web` query MUST include the literal string `{current_year}` AND
  a topic anchor. Failing either fails structural validation.
- If a scope key is empty (e.g. `{mesh.bar.threats_summary}` for a
  portfolio scope), omit that signal — do NOT fabricate.
- Do NOT introduce filler words ("comprehensive", "innovative",
  "cutting-edge") — every word in a query should improve recall or be cut.
