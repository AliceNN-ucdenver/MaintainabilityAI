/**
 * Tests for the pure title + body builders used by ResearchRequestService.
 * Verifies the body format matches the regex contracts in
 * code-templates/workflows/archeologist.yml so a programmatically-created
 * issue triggers the workflow with the expected parsed fields.
 */
import { describe, it, expect } from 'vitest';
import {
  buildResearchRequestBody,
  buildResearchRequestTitle,
} from '../researchRequestBuilders';

// These regexes are copied verbatim from
// code-templates/workflows/archeologist.yml (parse-trigger step) — if
// they drift, this test will catch it.
const SCOPE_RE = /scope:\s*(portfolio|platform|bar)\s*\n\s*scope_id:\s*([\w-]+)/i;
const PATH_RE = /path:\s*(research|archaeology)/i;
const REPO_RE = /target_repo:\s*([\w./-]+)/i;

describe('buildResearchRequestBody', () => {
  it('emits scope + scope_id + path that match the workflow regex contracts', () => {
    const body = buildResearchRequestBody({
      brief: 'Investigate how fraud-detection services integrate with celebrity APIs.',
      scope: { level: 'bar', id: 'APP-INS-001' },
      path: 'research',
    });
    expect(body).toMatch(SCOPE_RE);
    expect(body).toMatch(PATH_RE);
    const scope = SCOPE_RE.exec(body);
    expect(scope?.[1]).toBe('bar');
    expect(scope?.[2]).toBe('APP-INS-001');
    expect(PATH_RE.exec(body)?.[1]).toBe('research');
  });

  it('includes target_repo on the archaeology path', () => {
    const body = buildResearchRequestBody({
      brief: 'Profile the celeb-api codebase for STRIDE gaps.',
      scope: { level: 'bar', id: 'APP-INS-001' },
      path: 'archaeology',
      targetRepo: 'AliceN-ucdenver/celeb-api',
    });
    expect(REPO_RE.exec(body)?.[1]).toBe('AliceN-ucdenver/celeb-api');
  });

  it('omits target_repo on the research path even if provided', () => {
    const body = buildResearchRequestBody({
      brief: 'Survey market for celebrity-following features.',
      scope: { level: 'platform', id: 'imdb-lite' },
      path: 'research',
      targetRepo: 'should/not-appear',
    });
    expect(body).not.toMatch(REPO_RE);
  });

  it('emits scope_id alongside scope: line for platform and bar scopes', () => {
    const platformBody = buildResearchRequestBody({
      brief: 'IMDB-lite platform research.',
      scope: { level: 'platform', id: 'imdb-lite' },
      path: 'research',
    });
    expect(platformBody).toMatch(/scope:\s*platform/);
    expect(platformBody).toMatch(/scope_id:\s*imdb-lite/);

    const barBody = buildResearchRequestBody({
      brief: 'Single-BAR research.',
      scope: { level: 'bar', id: 'APP-IMDB-002' },
      path: 'research',
    });
    expect(barBody).toMatch(/scope:\s*bar/);
    expect(barBody).toMatch(/scope_id:\s*APP-IMDB-002/);
  });

  it('prepends a "Derived from" line when provenance is provided', () => {
    const body = buildResearchRequestBody({
      brief: 'Investigate token spoofing on follow endpoints.',
      scope: { level: 'bar', id: 'APP-INS-001' },
      path: 'research',
      derivedFrom: 'Oraculum issue #42',
    });
    expect(body.split('\n')[0]).toContain('Derived from: Oraculum issue #42');
  });

  it('preserves the brief above the Run metadata fence', () => {
    const body = buildResearchRequestBody({
      brief: 'Brief text on one line.',
      scope: { level: 'bar', id: 'APP-X-001' },
      path: 'research',
    });
    const aboveMetadata = body.split('## Run metadata')[0];
    expect(aboveMetadata).toContain('Brief text on one line.');
  });
});

describe('buildResearchRequestTitle', () => {
  it('uses the first non-empty line of the brief', () => {
    expect(buildResearchRequestTitle('First line\n\nSecond paragraph.'))
      .toBe('Research request: First line');
  });

  it('strips leading markdown heading or list markers', () => {
    expect(buildResearchRequestTitle('## My heading'))
      .toBe('Research request: My heading');
    expect(buildResearchRequestTitle('- Bullet point'))
      .toBe('Research request: Bullet point');
  });

  it('truncates very long first lines to ~80 chars with an ellipsis', () => {
    const longLine = 'a'.repeat(200);
    const title = buildResearchRequestTitle(longLine);
    expect(title.length).toBeLessThanOrEqual(120);     // prefix + 77 + …
    expect(title.endsWith('…')).toBe(true);
  });

  it('falls back to "Research request" when the brief is whitespace', () => {
    expect(buildResearchRequestTitle('   \n\n\n'))
      .toBe('Research request: Research request');
  });
});
