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
import { countUniqueIds, countUniqueSourceIds } from '../regexCounters';

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
