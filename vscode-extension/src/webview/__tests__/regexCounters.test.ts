/**
 * Regex-brittleness regression tests (Tasks #55 + #57).
 *
 * Cert run #2 (PR #126 / OKR-2026Q2-IMDB-001-celeb-api) exposed two
 * UI-side counter bugs in fetchPhaseSignal:
 *
 *   1. `**C\d+**` raw-occurrence match → 9 reported for a doc that
 *      truly contains 4 distinct conclusions (the agent restates each
 *      id in §9 Recommendations).
 *   2. `\bS\d+\b` reduce-to-max → high-water mark, not unique count.
 *      Brittle to accidental "S99" or non-citation S-N strings.
 *
 * Both were fixed by:
 *   1. Adopting the B31.v1.1 `countUniqueIds` helper (originally for
 *      HOW phase FR/SR) with a tighter 4-line window for WHY C-N.
 *   2. Counting unique S-N ids via Set.
 *
 * These tests use a fixture mirroring the cert-run-2 artifact §8 +
 * §9 structure so any future regression breaks here, not in
 * production on the next cert run.
 */
import { describe, expect, it } from 'vitest';
// Counters live in a standalone module so tests skip the vscode runtime.
import {
  countUniqueIds,
  countUniqueSourceIds,
  extractWhatArtifactSignals,
  extractSelfReviewFromArtifact,
} from '../regexCounters';

/**
 * Synthetic doc modeled on cert-run-2's research-doc.md:
 *   - §8 has 4 definitional conclusions, each line citing S-N sources
 *   - §9 Recommendations restates each conclusion by id (3 extra
 *     mentions of C1, 1 extra each of C2/C3/C4 → 9 raw, 4 unique)
 */
const CERT_RUN_2_LIKE_DOC = `# Research Doc

## 1. Source Premises
Listing S1 through S14 sources...

## 2. Executive Summary
Synthesis paragraph.

## 8. Formal Conclusions
1. **C1**: Privacy controls — supported by S1, S2, S3 because regulatory obligations apply. Confidence: **HIGH**
2. **C2**: Identity disambiguation must be SLO-governed — supported by S6, S7, S8 because error behavior matters. Confidence: **HIGH**
3. **C3**: Trust architecture beats novel IP — supported by S4, S9, S10 because market churn raises compliant-execution value. Confidence: **MEDIUM**
4. **C4**: Mesh can absorb capability — supported by S13, S14 because boundaries exist. Confidence: **MEDIUM**

## 9. Recommendations
1. Implement compliant data contract — based on **C1** and evidence from S1, S2, S3.
2. Two-stage disambiguation pipeline — based on **C2** and evidence from S6, S7, S8.
3. Provider risk scorecard — based on **C1** and **C3** and evidence from S3, S4.
4. Reuse fitness functions from APP-IMDB-001 — based on **C4** and evidence from S13, S14.
`;

describe('cert-run-2 conclusion counter regression (Task #55)', () => {
  const docLines = CERT_RUN_2_LIKE_DOC.split('\n');

  it('counts UNIQUE C-N ids, not raw occurrences (4 not 9)', () => {
    const result = countUniqueIds(
      docLines,
      /\*\*C\d+\*\*/,
      /\bC\d+\b/,
      /\bS\d+\b/,
      4,
    );
    expect(result.total).toBe(4);
    // Sanity-check: confirm the OLD buggy regex would have returned 9
    // raw occurrences — proves the fixture actually exercises the bug.
    const rawMatches = CERT_RUN_2_LIKE_DOC.match(/\*\*C\d+\*\*/g) ?? [];
    expect(rawMatches.length).toBe(9);
    expect(rawMatches.length).not.toBe(result.total);
  });

  it('checks per-id citation window — all 4 conclusions cite ≥1 source', () => {
    const result = countUniqueIds(
      docLines,
      /\*\*C\d+\*\*/,
      /\bC\d+\b/,
      /\bS\d+\b/,
      4,
    );
    expect(result.covered).toBe(4);
  });

  it('shrinks coverage when a conclusion lacks an S-N citation in its 4-line window', () => {
    // C1 + C2 each bare on their lines; S5 mention is >4 lines below
    // BOTH so neither falls into a covered window.
    const docNoCitations = `## Formal Conclusions
1. **C1**: A conclusion with no source citations nearby.
2. **C2**: Another bare conclusion.
Filler 1.
Filler 2.
Filler 3.
Some text mentioning S5 way down here — outside the 4-line window of C1+C2.
`;
    const result = countUniqueIds(
      docNoCitations.split('\n'),
      /\*\*C\d+\*\*/,
      /\bC\d+\b/,
      /\bS\d+\b/,
      4,
    );
    expect(result.total).toBe(2);
    expect(result.covered).toBe(0);
  });

  it('§9 Recommendations restatements do NOT inflate the count', () => {
    // Synthetic doc with C1 mentioned 8 times across the file but only
    // 1 definitional. The unique-id dedup keeps it at 1.
    const repetitive = `**C1** definition
... mention 1: see **C1**
... mention 2: per **C1**
... mention 3: **C1** again
... mention 4: **C1**
... mention 5: **C1**
... mention 6: **C1**
... mention 7: **C1**`;
    const result = countUniqueIds(
      repetitive.split('\n'),
      /\*\*C\d+\*\*/,
      /\bC\d+\b/,
      /\bS\d+\b/,
      4,
    );
    expect(result.total).toBe(1);
  });
});

describe('cert-run-2 source-id counter regression (Task #57)', () => {
  it('counts UNIQUE S-N ids via Set, not max(N)', () => {
    // Fixture cites S1, S5, S10, S14 — only 4 distinct sources, but
    // the OLD max(N) counter would have returned 14 (incorrect: implies
    // S2/S3/S4/etc all cited too).
    const doc = `Citing S1 and S5 here. Later S10. Finally S14.`;
    const sourceIds = countUniqueSourceIds(doc);
    expect(sourceIds.size).toBe(4);
    // Confirm OLD logic would have returned 14 on this fixture.
    const sourceMatches = doc.match(/\bS(\d+)\b/g) ?? [];
    const oldMax = sourceMatches.reduce((m, t) => {
      const n = parseInt(t.replace(/^S/, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    expect(oldMax).toBe(14);
    expect(sourceIds.size).not.toBe(oldMax);
  });

  it('cert-run-2 artifact-shaped doc with full S1-S14 range returns 14 (no regression)', () => {
    // When the artifact really does cite all of S1 through S14, the
    // new unique-id count agrees with the old max-N (14). Pin the
    // happy-path so the fix doesn't accidentally undercount.
    const doc = (Array.from({ length: 14 }, (_, i) => `Citing S${i + 1} here.`)).join('\n');
    expect(countUniqueSourceIds(doc).size).toBe(14);
  });

  it('ignores accidental S-numbers in source titles (e.g. suite codes, model names)', () => {
    // Old max(N) regex would have grabbed S99 from "iPhone S99" or
    // "Suite S100" and reported "S1–S99 cited" misleadingly. Unique-id
    // count still picks up the noise but at least doesn't pretend
    // S1–S99 is a contiguous citation range — it's just "3 sources
    // cited" (S1, S2, S99).
    const docWithNoise = `Citing S1 and S2. Source titled "iPhone S99 Review" referenced.`;
    const sourceIds = countUniqueSourceIds(docWithNoise);
    expect(sourceIds.size).toBe(3);
    expect(sourceIds.has('S99')).toBe(true);
  });
});

describe('HOW PRD bullet-form requirement counters', () => {
  it('counts bullet-prefixed bold FR/SR markers from current PRD shape', () => {
    const prd = `## Functional Requirements
- **FR-01**: Provide profile endpoints. Sources: S7, C3.
- **FR-02**: Require canonical PID-based identity linking. Sources: S9, C2.

## Non-Functional Requirements
- p95 latency for celebrity profile fetches must remain <200ms.
- Availability target: 99.9% monthly.

## Security Requirements
- **SR-01**: Enforce strong API access controls. Anchors: OWASP A01, A07.
- **SR-02**: Protect integrity of cached profiles. Anchors: OWASP A08, A09.
`;
    const lines = prd.split('\n');
    const fr = countUniqueIds(
      lines,
      /^\s*(?:[-*]\s+)?(\*\*FR-\d+\*\*|### +FR-\d+)/m,
      /\bFR-\d+\b/,
      /\b[CRSE]-?\d+\b/,
    );
    const nfr = countUniqueIds(
      lines,
      /^\s*(?:[-*]\s+)?(\*\*NFR-\d+\*\*|### +NFR-\d+)/m,
      /\bNFR-\d+\b/,
      /./,
    );
    const sr = countUniqueIds(
      lines,
      /^\s*(?:[-*]\s+)?(\*\*SR-\d+\*\*|### +SR-\d+)/m,
      /\bSR-\d+\b/,
      /\b(?:THR-?\d+|A0[1-9]|A10)\b/,
    );

    expect(fr.total).toBe(2);
    expect(fr.covered).toBe(2);
    expect(nfr.total).toBe(0);
    expect(sr.total).toBe(2);
    expect(sr.covered).toBe(2);
  });

  it('counts bullet-prefixed bold NFR markers when the agent writes governed NFRs', () => {
    const prd = `## Non-Functional Requirements
- **NFR-01**: p95 celebrity profile lookup remains below 200ms. Traces to: S7, C3.
- **NFR-02**: Profile cache invalidation emits observable audit logs. Traces to: S12.
`;
    const nfr = countUniqueIds(
      prd.split('\n'),
      /^\s*(?:[-*]\s+)?(\*\*NFR-\d+\*\*|### +NFR-\d+)/m,
      /\bNFR-\d+\b/,
      /./,
    );

    expect(nfr.total).toBe(2);
    expect(nfr.covered).toBe(2);
  });
});

/**
 * Task #58 — extractWhatArtifactSignals honest coverage check.
 *
 * Old behavior: frWithCites = frIds.size (tautology, always 100% ✓).
 * If a FR-N was declared in §4 but NO per-repo §5 frontmatter's
 * `addresses: [...]` listed it, the metric STILL reported 8/8 ✓.
 * That was a lying metric; user explicitly called this out: "I can't
 * have lying metrics."
 *
 * New behavior: a FR-N counts as covered IFF at least one per-repo
 * §5 subsection's `addresses:` list includes it. Gaps surface as a
 * ✗ on the card line ("FR addressed 6/8 ✗") + downgrade the workflow
 * verdict to `design-degraded`.
 */
describe('WHAT artifact signal honest coverage (Task #58)', () => {
  const FULL_COVERAGE_DOC = `# Code Design

## 1. Input Premises
Inherits FR-01, FR-02, SR-01 from the PRD.

## 5. Per-Repo Change List

### \`acme/celeb-api\`
---
repo: acme/celeb-api
mode: greenfield
addresses: [FR-01, FR-02, SR-01]
---
Implementation notes...

### \`acme/imdb-react-frontend\`
---
repo: acme/imdb-react-frontend
mode: brownfield
addresses: [FR-02]
---
Frontend wiring...
`;

  const GAP_DOC = `# Code Design

## 1. Input Premises
Inherits FR-01, FR-02, FR-03, SR-01 from the PRD.

## 5. Per-Repo Change List

### \`acme/celeb-api\`
---
repo: acme/celeb-api
mode: greenfield
addresses: [FR-01, SR-01]
---
FR-02 and FR-03 are deliberately UNCOVERED — the agent forgot them.
`;

  it('reports honest full coverage when every FR/SR is in some addresses[] list', () => {
    const sig = extractWhatArtifactSignals(FULL_COVERAGE_DOC);
    expect(sig.frCount).toBe(2);       // FR-01, FR-02
    expect(sig.srCount).toBe(1);       // SR-01
    expect(sig.frWithCites).toBe(2);
    expect(sig.srAnchored).toBe(1);
    expect(sig.perRepoChangeCount).toBe(2);
  });

  it('reports HONEST gap when a FR is declared but no repo addresses[] covers it', () => {
    const sig = extractWhatArtifactSignals(GAP_DOC);
    expect(sig.frCount).toBe(3);       // FR-01, FR-02, FR-03 all declared
    expect(sig.frWithCites).toBe(1);   // only FR-01 in addresses[]
    expect(sig.srCount).toBe(1);
    expect(sig.srAnchored).toBe(1);    // SR-01 IS in addresses[]
    // The gap signal: 1/3 < 3/3. Old buggy code would have reported 3/3.
    expect(sig.frWithCites).toBeLessThan(sig.frCount);
  });

  it('frWithCites is NEVER a tautology copy of frCount (Task #58 regression pin)', () => {
    // The old bug was literally `frWithCites: frIds.size`. Verify the
    // new code path produces a DIFFERENT value when a coverage gap
    // exists. If a future refactor accidentally re-introduces the
    // tautology, this test breaks immediately.
    const sig = extractWhatArtifactSignals(GAP_DOC);
    expect(sig.frWithCites).not.toBe(sig.frCount);
  });

  it('handles empty addresses[] list correctly (no false-positives)', () => {
    const docEmptyAddresses = `## 5. Per-Repo Change List
---
repo: acme/celeb-api
mode: greenfield
addresses: []
---
Doc mentions FR-01.
`;
    const sig = extractWhatArtifactSignals(docEmptyAddresses);
    expect(sig.frCount).toBe(1);
    expect(sig.frWithCites).toBe(0); // empty list → nothing addressed
  });

  it('handles quoted addresses[] entries (single + double quotes)', () => {
    const doc = `## 5. Per-Repo Change List
---
repo: acme/celeb-api
mode: greenfield
addresses: ["FR-01", 'FR-02']
---
Refs FR-01, FR-02.
`;
    const sig = extractWhatArtifactSignals(doc);
    expect(sig.frWithCites).toBe(2);
  });

  it('ignores frontmatter blocks without `repo:` key (e.g. Hatter Tag at doc head)', () => {
    const doc = `---
okr_id: OKR-test
run_id: WHAT-test-001
phase: what
intent_thread_uuid: abc-123
---

## 5. Per-Repo Change List

---
repo: acme/celeb-api
mode: greenfield
addresses: [FR-01]
---
`;
    const sig = extractWhatArtifactSignals(doc);
    expect(sig.perRepoChangeCount).toBe(1); // ONLY the repo block, not the Hatter Tag
    expect(sig.frCount).toBe(1);
    expect(sig.frWithCites).toBe(1);
  });

  it('counts addresses[] when repo slug is in preceding ### heading (Task #65 cert-run-5)', () => {
    // Cert-run-5 forensic: agent wrote `### owner/name` heading and
    // omitted `repo:` from the frontmatter. Old parser required `repo:`
    // IN the frontmatter; new parser falls back to the preceding
    // heading if it matches a repo-slug pattern.
    const doc = `## 5. Per-Repo Change List

### AliceNN-ucdenver/celeb-api
---
mode: greenfield
addresses: [FR-01, FR-02, FR-04, SR-01, SR-02, SR-03, SR-04]
---

- bullet

### AliceNN-ucdenver/imdb-react-frontend
---
mode: brownfield
addresses: [FR-03, FR-02, SR-02]
---

Mentions FR-01 FR-02 FR-03 FR-04 SR-01 SR-02 SR-03 SR-04.
`;
    const sig = extractWhatArtifactSignals(doc);
    expect(sig.frCount).toBe(4);
    expect(sig.srCount).toBe(4);
    // OLD parser would have returned frWithCites=0 srAnchored=0.
    expect(sig.frWithCites).toBe(4);
    expect(sig.srAnchored).toBe(4);
    expect(sig.perRepoChangeCount).toBe(2);
  });

  it('still accepts canonical `repo:`-in-frontmatter form (no regression)', () => {
    // The fix tolerates both shapes — canonical with `repo:` MUST keep working.
    const doc = `## 5. Per-Repo Change List

### \`acme/celeb-api\`
---
repo: acme/celeb-api
mode: greenfield
addresses: [FR-01, SR-01]
---

Mentions FR-01 SR-01.
`;
    const sig = extractWhatArtifactSignals(doc);
    expect(sig.frWithCites).toBe(1);
    expect(sig.srAnchored).toBe(1);
  });

  it('ignores frontmatter blocks whose preceding heading is NOT a repo slug', () => {
    // A bare `### Section title` should not be confused for a repo slug.
    // The heading "Some other section" doesn't match the owner/name shape.
    const doc = `## 5. Per-Repo Change List

### Some other section
---
mode: greenfield
addresses: [FR-01]
---

Mentions FR-01.
`;
    const sig = extractWhatArtifactSignals(doc);
    // No repo: AND no slug-shaped heading → block ignored, no coverage.
    expect(sig.frWithCites).toBe(0);
  });

  it('aggregates addresses[] across multiple per-repo §5 subsections', () => {
    // FR-02 is addressed by repo-b, not repo-a. Verify the union is
    // computed across all blocks, not just the first.
    const doc = `## 5. Per-Repo Change List

---
repo: acme/repo-a
mode: greenfield
addresses: [FR-01]
---

Mentions FR-01 and FR-02.

---
repo: acme/repo-b
mode: brownfield
addresses: [FR-02]
---
`;
    const sig = extractWhatArtifactSignals(doc);
    expect(sig.frCount).toBe(2);
    expect(sig.frWithCites).toBe(2); // union of both repos' addresses
  });
});

/**
 * Task #64 — artifact-side self-review fallback parser. Mirrors the
 * workflow's 3-source parser so the UI surfaces scores even before the
 * audit workflow runs (or when its parser misses). Each test pins
 * one source so any future drift surfaces here.
 *
 * Cert-run-4 forensic: the agent wrote self-review data in YAML
 * frontmatter — the workflow's PR-body-only parser missed it. Both
 * sides (workflow + UI) now have a YAML-frontmatter fallback.
 */
describe('artifact-side self-review extraction (Task #64)', () => {
  it('parses ### Self-review markdown blocks inside artifact body', () => {
    const doc = `# Research Doc

## 1. Section
Some content.

### Self-review — Architect (round 1)
SCORE: 0.85
SEVERITY: MINOR
COVERED: [ADR-001]
MISSING: []
CHANGES: []

### Self-review — Security (round 1)
SCORE: 0.88
SEVERITY: PASS
COVERED: [THR-002]
MISSING: []
CHANGES: []
`;
    const r = extractSelfReviewFromArtifact(doc);
    expect(r.source).toBe('artifact-md');
    expect(r.architect).toEqual({ round: 1, score: 0.85, severity: 'MINOR' });
    expect(r.security).toEqual({ round: 1, score: 0.88, severity: 'PASS' });
  });

  it('parses Code- prefixed personas (WHAT phase)', () => {
    const doc = `### Self-review — Code-Architect (round 2)
SCORE: 0.96
SEVERITY: PASS
COVERED: []
MISSING: []
CHANGES: []
`;
    const r = extractSelfReviewFromArtifact(doc);
    expect(r.source).toBe('artifact-md');
    expect(r.architect).toEqual({ round: 2, score: 0.96, severity: 'PASS' });
  });

  it('parses YAML frontmatter self_review block (cert-run-4 exact shape)', () => {
    const doc = `---
okr_id: OKR-test-001
run_id: HOW-test-001
phase: how
self_review:
  rounds: 1
  converged: true
  architect:
    score: 0.92
    severity: MINOR
  security:
    score: 0.90
    severity: MINOR
---

## Body
content
`;
    const r = extractSelfReviewFromArtifact(doc);
    expect(r.source).toBe('artifact-frontmatter-yaml');
    expect(r.architect).toEqual({ round: 1, score: 0.92, severity: 'MINOR' });
    expect(r.security).toEqual({ round: 1, score: 0.90, severity: 'MINOR' });
  });

  it('tolerates code-architect/code-security keys in YAML frontmatter (WHAT variant)', () => {
    const doc = `---
phase: what
self_review:
  rounds: 2
  code-architect:
    score: 0.96
    severity: PASS
  code-security:
    score: 0.94
    severity: PASS
---

## Body
`;
    const r = extractSelfReviewFromArtifact(doc);
    expect(r.source).toBe('artifact-frontmatter-yaml');
    expect(r.architect).toEqual({ round: 2, score: 0.96, severity: 'PASS' });
    expect(r.security).toEqual({ round: 2, score: 0.94, severity: 'PASS' });
  });

  it('prefers markdown blocks when both forms are present (markdown is canonical)', () => {
    const doc = `---
phase: how
self_review:
  rounds: 1
  architect: { score: 0.50, severity: BLOCKING }
  security:  { score: 0.40, severity: BLOCKING }
---

### Self-review — Architect (round 1)
SCORE: 0.92
SEVERITY: MINOR
COVERED: []
MISSING: []
CHANGES: []
`;
    const r = extractSelfReviewFromArtifact(doc);
    expect(r.source).toBe('artifact-md');
    // Markdown values win, not the frontmatter's BLOCKING-on-0.50.
    expect(r.architect?.score).toBe(0.92);
    expect(r.architect?.severity).toBe('MINOR');
  });

  it('returns source: none when artifact has neither form', () => {
    const doc = `# Bare doc with no self-review data anywhere.

## Body
Just content.
`;
    const r = extractSelfReviewFromArtifact(doc);
    expect(r.source).toBe('none');
    expect(r.architect).toBeUndefined();
    expect(r.security).toBeUndefined();
  });

  it('handles empty / missing input gracefully', () => {
    expect(extractSelfReviewFromArtifact('').source).toBe('none');
    expect(extractSelfReviewFromArtifact(undefined as unknown as string).source).toBe('none');
  });

  it('parses BOTH personas when their blocks are adjacent (cert-run-5 bug J regression)', () => {
    // Cert-run-5 workflow forensic: BLOCK_RE consumed 10 lines past
    // Code-Architect heading, swallowing Code-Security heading. finditer
    // never matched Security as a separate block → sec=None(None) in
    // workflow output. The TS-side artifact parser uses an explicit
    // SCORE/SEVERITY-terminated regex (not the workflow's loose
    // 10-line consumer) so we don't share the bug, but pin it
    // explicitly: both personas in cert-run-5-like adjacency must
    // parse cleanly here.
    const doc = `## Body content

### Self-review — Code-Architect (round 1)
SCORE: 0.96
SEVERITY: PASS
COVERED: [FR-01]
MISSING: []
CHANGES: []

### Self-review — Code-Security (round 1)
SCORE: 0.95
SEVERITY: PASS
COVERED: [SR-01]
MISSING: []
CHANGES: []
`;
    const r = extractSelfReviewFromArtifact(doc);
    expect(r.source).toBe('artifact-md');
    expect(r.architect).toEqual({ round: 1, score: 0.96, severity: 'PASS' });
    expect(r.security).toEqual({ round: 1, score: 0.95, severity: 'PASS' });
  });

  it('tolerates hyphen separator instead of em-dash (--- vs em-dash for stripped-unicode runtimes)', () => {
    const doc = `### Self-review - Architect (round 1)
SCORE: 0.80
SEVERITY: MINOR
COVERED: []
MISSING: []
CHANGES: []
`;
    const r = extractSelfReviewFromArtifact(doc);
    expect(r.source).toBe('artifact-md');
    expect(r.architect?.score).toBe(0.80);
  });
});
