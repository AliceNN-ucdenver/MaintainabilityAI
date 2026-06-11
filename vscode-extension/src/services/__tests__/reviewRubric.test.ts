/**
 * Guard: the looking-glass pillar packs must each carry a deterministic
 * Graded Checklist (governance-review-alignment v2). The drift score was
 * swinging 16↔66 on identical inputs because the review was open-ended LLM
 * discovery (6–21 findings); anchoring each pillar to a fixed, severity-tagged
 * checklist makes the finding count — and the score — reproducible. This test
 * pins that the rubric exists with the expected check-id prefixes, so an edit
 * that deletes/renames the checklist (reverting to free-form) fails CI.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const PACKS = path.resolve(__dirname, '..', '..', '..', 'prompt-packs', 'looking-glass');

const PILLAR_RUBRICS: { file: string; prefix: string; minChecks: number }[] = [
  { file: 'architecture.md', prefix: 'ARCH', minChecks: 6 },
  { file: 'application-security.md', prefix: 'SEC', minChecks: 6 },
  { file: 'information-risk.md', prefix: 'RISK', minChecks: 5 },
  { file: 'operations.md', prefix: 'OPS', minChecks: 6 },
];

const SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

/** Collapse markdown whitespace (line-wrapping, bold markers) for phrase checks. */
function flat(md: string): string {
  return md.replace(/\*\*/g, '').replace(/\s+/g, ' ').toLowerCase();
}

describe('looking-glass pillar packs — deterministic graded checklist', () => {
  for (const { file, prefix, minChecks } of PILLAR_RUBRICS) {
    describe(file, () => {
      const md = fs.readFileSync(path.join(PACKS, file), 'utf8');

      it('has a "Graded Checklist" authoritative-scored section', () => {
        expect(md).toMatch(/##\s+Graded Checklist/);
        expect(flat(md)).toContain('one finding per failed check');
      });

      it(`declares >= ${minChecks} ${prefix}-NN checks, each with a fixed severity`, () => {
        // Rubric rows look like: | ARCH-1 | high | FAIL when… |
        const rows = [...md.matchAll(
          new RegExp(`\\|\\s*(${prefix}-\\d+)\\s*\\|\\s*(\\w+)\\s*\\|`, 'g'),
        )];
        const ids = rows.map(r => r[1]);
        const sevs = rows.map(r => r[2].toLowerCase());

        expect(ids.length).toBeGreaterThanOrEqual(minChecks);
        // ids are unique + contiguous-ish (no duplicates)
        expect(new Set(ids).size).toBe(ids.length);
        // every check carries a valid fixed severity
        for (const s of sevs) { expect(SEVERITIES.has(s)).toBe(true); }
      });
    });
  }

  it('default pack documents the rubric grading methodology', () => {
    const md = fs.readFileSync(path.join(PACKS, 'default.md'), 'utf8');
    expect(flat(md)).toContain('graded rubric, not open-ended discovery');
    expect(flat(md)).toContain('one finding per failed check');
  });
});
