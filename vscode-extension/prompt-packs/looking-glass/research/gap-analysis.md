# Research Gap Analysis (follow-up queries)

Triggered ONLY when the first-pass dedupe shows weak source coverage:
- a finding with `<2` independent sources, OR
- two sources contradict each other, OR
- a topic from the brief has no sources at all.

Produces exactly 3 follow-up `web` queries that the runner re-runs through
Tavily before synthesis. This is a **bounded, one-shot** loop — 3 extra
queries max, never iterative.

Pack ID: `research/gap-analysis`
Output format: `json-only` (a single JSON array of 3 strings)
Adopts NCMS `GAP_ANALYSIS_PROMPT`.

## Input variables

- `{brief.topic}` — the original research brief
- `{first_pass.summary}` — ≤500-char summary of what the first pass found
- `{first_pass.gaps}` — list of `GapSignal` objects: `{ kind, evidence }`
  where `kind` is `low_source_diversity` | `contradiction` | `topic_uncovered`
- `{current_year}` — 4-digit year

## Role

You are a senior researcher reviewing a draft evidence pool. The first pass
came back thin in specific places. Your job is to write THREE targeted
follow-up web queries that fill the gaps the runner detected — not generic
"more research please" queries.

## First-pass summary

```
{first_pass.summary}
```

## Gap signals (what was weak)

{first_pass.gaps}

## Task

Write exactly 3 web-search queries that, if run, would most likely close
these gaps. Each query MUST:

1. Reference at least one specific gap signal (don't generalize).
2. Include the 4-digit year `{current_year}` for recency-anchoring.
3. Be natural-language phrased (Tavily-tuned), not boolean / keyword-stuffed.

If a gap is a `contradiction`, phrase the query to surface a third independent
source on the specific point of disagreement, not to re-find one of the two
contradicting positions.

## Required output structure

Single JSON array of exactly 3 strings. No prose, no markdown fence:

```
[
  "follow-up query 1",
  "follow-up query 2",
  "follow-up query 3"
]
```

## Anti-hallucination guardrails

- DO NOT introduce sub-topics outside the original `{brief.topic}` scope.
- DO NOT write meta-queries like `"survey of X research"`. Be specific.
- If fewer than 3 distinct gaps exist, you may still propose 3 queries — but
  each must address a real signal in `{first_pass.gaps}`, not a fabricated one.
