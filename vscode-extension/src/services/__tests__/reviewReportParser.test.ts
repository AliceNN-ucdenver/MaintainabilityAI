/**
 * Deterministic review-report summary parser (governance-review-alignment v2).
 * Fixtures mirror the live review-218.md shape so the derived "top findings"
 * stay byte-faithful to what the architecture-review-agent writes.
 */
import { describe, expect, it } from 'vitest';
import { deriveTopFindings, sectionBody } from '../reviewReportParser';

const REPORT = `## Summary

Drift score: **60**

## Architecture Findings

- **[high]** Undocumented imdb-identity service. Evidence: \`imdb-identity/src/app.ts:18-21\`.
- **[medium]** Frontend defaults to HTTP. Evidence: \`imdb-react-frontend/.env.development:1\`.
- **[medium]** SMTP email relationship not implemented. Evidence: \`movie-api/package.json:13-24\`.

## Security Findings

- **[critical]** imdb-identity violates BAR security controls (hardcoded creds, weak crypto). Evidence: \`imdb-identity/src/app.ts:18-21\`.
- **[high]** Security governance artifacts unpopulated. Evidence: \`security/threat-model.yaml:9\`.

## Information Risk Findings

- **[high]** PII-bearing auth data not classified. Evidence: \`information-risk/data-classification.yaml:3\`.
- **[medium]** VISM empty while integrations are present. Evidence: \`information-risk/vism.yaml:3\`.

## Operations Findings

- **[medium]** Service mapping empty. Evidence: \`operations/service-mapping.yaml:3-11\`.
- **[medium]** Runbook templated. Evidence: \`operations/runbook.md:14-21\`.

## Recommendations

1. Fix.

## References

- \`app.yaml\`
`;

describe('reviewReportParser.sectionBody', () => {
  it('extracts only the requested pillar section', () => {
    const body = sectionBody(REPORT, 'Security Findings');
    expect(body).toContain('imdb-identity violates BAR security controls');
    expect(body).not.toContain('Service mapping empty');
    expect(body).not.toContain('PII-bearing auth data');
  });

  it('returns empty string for a missing section', () => {
    expect(sectionBody(REPORT, 'Nonexistent Findings')).toBe('');
  });
});

describe('reviewReportParser.deriveTopFindings', () => {
  it('returns severity-tagged findings per pillar, evidence stripped', () => {
    const s = deriveTopFindings(REPORT);
    expect(s.architecture).toEqual([
      '[high] Undocumented imdb-identity service.',
      '[medium] Frontend defaults to HTTP.',
      '[medium] SMTP email relationship not implemented.',
    ]);
    expect(s.security[0]).toBe(
      '[critical] imdb-identity violates BAR security controls (hardcoded creds, weak crypto).',
    );
    expect(s.informationRisk).toHaveLength(2);
    expect(s.operations.every(f => f.startsWith('[medium]'))).toBe(true);
  });

  it('sorts critical → high → medium → low regardless of report order', () => {
    const jumbled = `## Architecture Findings

- **[low]** nit one.
- **[critical]** big one.
- **[medium]** mid one.
- **[high]** high one.
`;
    const s = deriveTopFindings(jumbled, 4);
    expect(s.architecture).toEqual([
      '[critical] big one.',
      '[high] high one.',
      '[medium] mid one.',
      '[low] nit one.',
    ]);
  });

  it('caps at perPillar findings', () => {
    const many = `## Security Findings

- **[critical]** a.
- **[critical]** b.
- **[high]** c.
- **[medium]** d.
`;
    expect(deriveTopFindings(many, 2).security).toEqual(['[critical] a.', '[critical] b.']);
  });

  it('yields empty arrays for an empty / no-findings report', () => {
    expect(deriveTopFindings('## Summary\n\nClean.\n')).toEqual({
      architecture: [], security: [], informationRisk: [], operations: [],
    });
  });
});
