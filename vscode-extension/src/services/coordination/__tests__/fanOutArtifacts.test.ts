import { describe, expect, it } from 'vitest';
import {
  FANOUT_LANDING_LABEL,
  isFanOutLandingIssue,
  isFanOutImplPr,
} from '../fanOutArtifacts';

/**
 * Reset fan-out cleanup matches GitHub artifacts by the markers the
 * fan-out engine + impl-agent stamp — the source of truth for finding
 * EVERY artifact, including duplicate landing issues a buggy fan-out
 * created but design-fan-out.yaml (one row per repo) never recorded.
 */

const OKR = 'OKR-2026Q2-IMDB-001-celeb-api';

describe('fan-out artifact predicates', () => {
  it('the landing label constant matches what onFanOut stamps', () => {
    expect(FANOUT_LANDING_LABEL).toBe('oraculum-design-landing');
  });

  describe('isFanOutLandingIssue', () => {
    it('matches a landing-issue body carrying the okr_id HTML comment', () => {
      const body = `<!-- okr_id: ${OKR} -->\n<!-- fanout_target: AliceNN-ucdenver/celeb-api -->\n\n## OKR context`;
      expect(isFanOutLandingIssue(body, OKR)).toBe(true);
    });

    it('matches even one of 20 duplicate issues (all carry the same marker)', () => {
      // The whole point: every dup the listener-leak created has the
      // identical body marker, so the query finds all of them — unlike
      // design-fan-out.yaml which recorded only the last writer.
      const dupBody = `<!-- okr_id: ${OKR} -->\n## OKR context\nImplement slice`;
      expect(isFanOutLandingIssue(dupBody, OKR)).toBe(true);
    });

    it('does NOT match a different OKR', () => {
      const body = `<!-- okr_id: OKR-2026Q2-OTHER-999-x -->`;
      expect(isFanOutLandingIssue(body, OKR)).toBe(false);
    });

    it('does NOT match an unrelated issue with no marker', () => {
      expect(isFanOutLandingIssue('Just a normal bug report', OKR)).toBe(false);
    });

    it('handles null/undefined body', () => {
      expect(isFanOutLandingIssue(null, OKR)).toBe(false);
      expect(isFanOutLandingIssue(undefined, OKR)).toBe(false);
    });
  });

  describe('isFanOutImplPr', () => {
    it('matches an impl PR by its bracketed title', () => {
      const title = `[${OKR}] Implement AliceNN-ucdenver/celeb-api slice`;
      expect(isFanOutImplPr(title, '', OKR)).toBe(true);
    });

    it('matches an impl PR by the implementation_chain body block when title differs', () => {
      const body = `Implements the contract.\n\n\`\`\`yaml\nimplementation_chain:\n  okr_id: ${OKR}\n\`\`\``;
      expect(isFanOutImplPr('chore: something', body, OKR)).toBe(true);
    });

    it('does NOT match a PR for a different OKR', () => {
      expect(isFanOutImplPr('[OKR-OTHER] Implement x', 'okr_id: OKR-OTHER', OKR)).toBe(false);
    });

    it('does NOT match an unrelated PR', () => {
      expect(isFanOutImplPr('Bump deps', 'routine dependency update', OKR)).toBe(false);
    });

    it('handles null/undefined title + body', () => {
      expect(isFanOutImplPr(null, null, OKR)).toBe(false);
      expect(isFanOutImplPr(undefined, undefined, OKR)).toBe(false);
    });
  });
});
