/**
 * Canonical research-doc body used by synthesis-validator + synthesize-report
 * tests. Mirrors the 10-section structure the prompt asks for, with three
 * sources, two conclusions, and two recommendations — enough to exercise
 * every citation rule.
 */
export const CANONICAL_SYNTHESIS_BODY = `## Source Premises

**S1**: First Source — https://a.example/article (tavily, retrieved 2026-05-17, salience 0.92).
Short excerpt about agentic governance and PRD generation.

**S2**: Second Source — https://b.example/article (tavily, retrieved 2026-05-17, salience 0.81).
Coverage of CALM-aligned architecture controls.

**S3**: Third Source — https://c.example/article (tavily, retrieved 2026-05-17, salience 0.74).
Notes on threat modelling for agentic systems.

## Executive Summary

The market for agentic governance tooling is forming around three threads (S1, S2): explicit
architecture pinning, prompt-pack provenance, and post-hoc audit chains. Threat-modelling
practice is starting to coalesce around STRIDE-aligned templates (S3).

## Cross-Source Analysis

### Standards

S1 and S2 agree that CALM-style architecture-as-code is becoming the de-facto baseline.

### Security

S3 details how STRIDE templates can be pre-loaded into agent context windows for grounding.

### Implementation

S1 surveys runner architectures that separate pure nodes from LLM nodes.

### Market

S2 reports adoption signals from three vendors offering governance meshes.

## Evidence Gaps

- No source covers cost-attribution patterns for multi-agent runs.
- Only one source (S3) addresses threat modelling for agentic systems.

## Jobs-to-be-Done Analysis

- When ops teams need to audit an agent run, they want one chain root hash so that one number proves the run (S1).
- When architects review a PRD, they want explicit FR ↔ CALM-node mapping so they can spot drift before merge (S2).

## Patent Landscape

No relevant patent prior art was returned in this run.

## Whitespace Analysis

- Multi-provider cost attribution is unaddressed (S1, S2 — both gloss it).

## Formal Conclusions

**C1** Agentic governance tooling is converging on architecture-as-code + audit chain hashing.
Confidence: **HIGH**. Citations: S1, S2.

**C2** Threat modelling for agentic systems is an under-developed area worth investing in.
Confidence: **MEDIUM**. Citations: S2, S3.

## Recommendations

- Build the runner around explicit pure/LLM node separation and a hash-chained audit log. Traces to: C1.
- Pre-seed STRIDE templates into the agent's mesh context before any synthesis hop. Traces to: C2.

## References

- S1 — First Source — https://a.example/article — 2026-05-17
- S2 — Second Source — https://b.example/article — 2026-05-17
- S3 — Third Source — https://c.example/article — 2026-05-17
`;
